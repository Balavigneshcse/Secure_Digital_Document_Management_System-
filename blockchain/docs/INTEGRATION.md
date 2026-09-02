# Integrating the Blockchain & Security Module into SentinelDMS

This is the missing piece the README doesn't cover: the README explains how to
run *this module* standalone. This doc explains how it plugs into the *rest*
of SentinelDMS — what Balavignesh's document-service needs to call, what
Arunkumar's schema needs to hold, and where this sits in the request
lifecycle so the whole team is wiring things together the same way.

---

## 1. Where this module sits in the architecture

From the team's high-level architecture doc, this module is the
**BLOCKCHAIN LAYER** and part of the **SECURITY LAYER** box — it does not sit
on the direct path between the frontend and the database. Everything reaches
it *through* the Application Services layer:

```
React frontend
      │
      ▼
API Gateway (Nginx)
      │
      ▼
Document Service (Balavignesh/NestJS)  ──HTTP──▶  blockchain-api (this module)
      │                                                  │
      ▼                                                  ▼
PostgreSQL (document_versions, blockchain_anchors)   Hyperledger Fabric ledger
```

The document-service never talks to Fabric directly, and never touches
`node-forge` or Keycloak's admin API — it only ever calls this module's HTTP
endpoints. That boundary is what keeps your module independently testable and
lets you keep working even if Balavignesh's service isn't finished yet.

---

## 2. The real upload flow, step by step

This is the sequence your doc's "document upload flow" diagram compresses
into one line — spelled out so whoever wires the document-service knows
exactly when to call what:

1. User uploads a file via the frontend → hits document-service.
2. Document-service runs OCR + AI classification (Deepak's module) — not your
   concern, happens before your module is called.
3. Document-service encrypts the file and writes it to MinIO/S3 (Arunkumar's
   storage layer).
4. Document-service computes the SHA-256 hash of the file **at this point**
   — while the content is freshest in memory — and calls:

   ```
   POST http://blockchain-api:4000/blockchain/anchor
   { "documentId": "...", "versionId": "...", "hash": "...", "uploaderId": "..." }
   ```

5. **This call is synchronous**, per your doc's own recommendation for the
   prototype. Document-service should `await` this and only mark the upload
   "complete" once it gets back `{ txId, anchoredAt }`. If it times out or
   errors, the document-service should retry or surface the failure — don't
   silently mark the document as anchored when it wasn't; that would defeat
   the entire tamper-evidence guarantee.
6. Document-service writes `txId` + `anchoredAt` back into its own
   `blockchain_anchors` table (see schema note below) alongside the metadata
   row it already writes to `document_versions`.
7. (Optional, same flow) If the officer applies a signature, document-service
   calls `POST /signatures/sign` the same way, synchronously, and stores
   `signatureValue` + `signedAt` against the document version.

For the **tamper-detection demo moment**, the audit/compliance dashboard (or
any "verify" button in the UI) calls:

```
GET http://blockchain-api:4000/blockchain/verify/:documentId/:versionId
```

on demand — this is *not* part of the upload flow, it's called whenever
someone wants to check integrity (dashboard load, before opening a document,
or live during the demo).

---

## 3. What Arunkumar's schema needs to hold

Your module doesn't own a database — it's stateless except for the ledger
itself and the local signature/cert store used for the prototype PKI. But the
**document-service** needs somewhere to persist what your module returns.
Share this shape with Arunkumar if it isn't already in his schema doc:

```sql
CREATE TABLE blockchain_anchors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES document_versions(document_id),
  version_id      TEXT NOT NULL,
  hash            TEXT NOT NULL,
  tx_id           TEXT NOT NULL,
  anchored_at     TIMESTAMPTZ NOT NULL,
  uploader_id     UUID NOT NULL,
  UNIQUE (document_id, version_id)
);

CREATE TABLE document_signatures (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id   TEXT NOT NULL,
  signature_value       TEXT NOT NULL,
  signed_by             UUID NOT NULL,
  signed_at             TIMESTAMPTZ NOT NULL
);
```

Note this is a **duplicate, queryable copy** of what's already immutably on
the ledger — the whole point of anchoring is that this table alone isn't
trustworthy proof, but it's what powers fast dashboard queries without
hitting Fabric on every page load. The `/blockchain/verify` and
`/blockchain/audit` endpoints are the actual source of truth when integrity
genuinely needs checking.

---

## 4. Auth: how Keycloak ties into the rest of the app

This module's `keycloak/realm-export.json` is the **source of truth for
roles**, but the actual login flow runs through Balavignesh's Auth Service,
not through this module directly:

1. Frontend redirects to Keycloak's login (realm `sentineldms`).
2. Keycloak issues a JWT containing the user's role(s) and department
   attribute (once you configure the ABAC attribute mapper — see the note in
   the realm JSON).
3. The Auth Service / API Gateway validates that JWT on every request.
4. **This module does not itself enforce RBAC/ABAC** — it assumes the
   document-service has already checked that the caller is allowed to
   anchor/verify/sign a given document before it ever calls your endpoints.
   If you want defense-in-depth, the fastest addition is a middleware in
   `services/blockchain-api/src/index.js` that validates the same JWT — flag
   this to Balavignesh as an open decision, it's not currently implemented.

---

## 5. Environment differences: local dev vs. team integration

When you're the only one running this, `.env` points at paths on your own
machine. Once this plugs into the team's shared setup, agree on these before
merging:

| Variable | Local dev (yours) | Shared/integration environment |
|---|---|---|
| `DOCUMENT_STORAGE_PATH` | local folder | wherever Arunkumar's MinIO bucket is mounted/reachable |
| `FABRIC_CONNECTION_PROFILE` | your local `test-network` copy | same, but confirm everyone runs the network with the same channel name (`sentinelchannel`) |
| `FABRIC_DISCOVERY_AS_LOCALHOST` | `true` (host) | `false` if blockchain-api runs in Balavignesh's docker-compose stack alongside the other services |
| `PORT` | `4000` | whatever the API Gateway/Nginx config expects to proxy to — confirm with Balavignesh, don't just assume 4000 is free |

**Action item:** once Balavignesh's docker-compose for the full stack exists,
add this module's `blockchain-api` service into *that* compose file (or have
him add it) rather than running two separate compose files side by side —
this repo's own `docker-compose.yml` is meant for developing this module in
isolation, not as the final integration point.

---

## 6. Integration testing checklist (do this before the Week 4–5 integration phase)

- [ ] Document-service can successfully call `/blockchain/anchor` and receives a `txId`
- [ ] `blockchain_anchors` table row gets written with matching `document_id`/`version_id`
- [ ] Uploading, then tampering the stored file directly, then calling `/blockchain/verify` returns `isValid: false` — run this with a **real** file from the real storage path, not the throwaway PoC script
- [ ] Signature flow round-trips: sign → verify returns `isValid: true` for an untouched document
- [ ] A JWT issued by the imported Keycloak realm is at least readable by the Auth Service (even before ABAC policies are fully configured)
- [ ] Confirm with Balavignesh whether this module's port and env vars match what his gateway/compose config expects

---

## 7. What to say in the report if asked "how does this connect to the rest of the system?"

Judges sometimes probe integration specifically, separate from the demo. Have
this ready: *"The blockchain and signature module is a separate microservice
the document service calls synchronously over HTTP during upload — it never
talks to the database or frontend directly. This keeps the blockchain layer
independently testable and swappable, and means only a hash ever needs to be
anchored, not the document itself."*
