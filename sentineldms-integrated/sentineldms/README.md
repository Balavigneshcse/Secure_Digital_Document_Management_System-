# SentinelDMS — Integrated Monorepo

Backend (Balavignesh) + Frontend (Dineshkarthick) + Database (Arunkumar) +
Blockchain/Security (Dharani Dharan), merged into one runnable system.

## What's real vs. mocked right now

| Piece | Status |
|---|---|
| Backend API, auth, database | **Real** — every endpoint hits real Postgres via Prisma |
| Frontend | **Real** — `USE_MOCKS` flipped off, calls the real backend |
| MinIO file storage | **Real** |
| Document hashing (SHA-256) | **Real** |
| AI OCR/classification | **Mocked** — Deepak's service doesn't exist yet; falls back automatically |
| Blockchain anchoring/verify/signatures | **Mocked by default** — Dharani's blockchain-api needs a real Hyperledger Fabric network, which is a separate multi-step setup (see "Optional: real blockchain" below). Falls back to mock responses automatically until then. |
| Elasticsearch search | **Not wired yet** — infra is up, `/documents` still searches Postgres directly |

Everything in "mocked" has a clearly-logged fallback — the app runs end-to-end without them, you just won't see real Fabric transactions or real OCR text until those pieces are connected.

## First-time setup

```bash
# 1. Start shared infra: Postgres, Redis, MinIO, Elasticsearch, Kibana, Keycloak
docker compose up -d
docker compose ps   # wait until everything is healthy — Elasticsearch takes the longest

# 2. Apply Arunkumar's real schema + seed data (NOT prisma migrate — his raw
#    SQL is the source of truth; it has views/triggers Prisma can't generate)
cd database
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
cd ..

# 3. Backend
cd backend
npm install
npx prisma generate     # generates the client against Arunkumar's already-applied schema — do NOT run `prisma migrate dev`
npm run start:dev
# → http://localhost:3000/api-docs

# 4. Frontend (separate terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Both `backend/.env` and `frontend/.env` are already filled in to match this compose file — no manual edits needed for local dev.

## Logging in

The frontend's login screen calls the real backend, which validates against
Keycloak. Five test users are seeded (one per role), all with password `Password123!`:

| Email | Role |
|---|---|
| rajesh.kumar@ncrb.gov.in | Admin |
| priya.sharma@ncrb.gov.in | Investigating Officer |
| meena.iyer@forensics.gov.in | Forensic Expert |
| ramkumar@judiciary.gov.in | Judicial Officer |
| observer@judiciary.gov.in | Auditor |

The MFA step accepts **any 6-digit code** — real authentication already happened against Keycloak in step 1; the MFA screen is UI-accurate but not backed by real TOTP yet (see "Known gaps" below).

## Demo: tamper detection

Arunkumar's seed data includes a document that was deliberately re-uploaded
with different content after being blockchain-anchored — its stored hash and
anchored hash won't match. Hit `POST /documents/:id/verify` on it (or click
"Verify" in the frontend) to see the tamper flag trip. See
`database/README.md` for which document/case this is.

## Optional: real blockchain anchoring

By default, `/blockchain/anchor` and `/blockchain/verify` calls fail (no
Fabric network running) and the backend logs a warning + returns a mock
result — the whole app still works. To make it real:

```bash
cd blockchain
cat README.md   # full Hyperledger Fabric test-network setup — clone
                 # fabric-samples, deploy chaincode, enroll identities.
                 # This is a genuinely separate ~30-60 min setup, not a
                 # quick step — budget time for it before a live demo.
```

Once that's running (`npm start` inside `blockchain/services/blockchain-api`,
port 4000), the backend will start getting real responses automatically —
no backend code changes needed, it already points at `localhost:4000`.

## Architecture notes worth knowing

- **Role model**: Dharani's Keycloak realm issues 5 roles (`investigating_officer`, `judicial_officer`, `forensic_expert`, `admin`, `auditor`). The backend maps these to short codes (`IO`, `JUDGE`, `FORENSIC`, `ADMIN`, `AUDITOR`) that the frontend's `Role` type now also uses — see `backend/src/auth/auth.service.ts` for the exact mapping, and note `AUDITOR` was added to the frontend's `Role` type as part of this integration (it was missing).
- **Tamper verification storage bridge**: Dharani's blockchain-api reads files from local disk to recompute hashes — it has no MinIO client. The backend mirrors every uploaded file to a plain folder (`shared-storage/`, gitignored) that both processes can read. See `backend/src/storage/local-mirror.service.ts` for why.
- **Case status**: the frontend's 3-state `CaseStatus` (`OPEN`/`UNDER_REVIEW`/`CLOSED`) is a deliberate collapse of Arunkumar's 6-state DB enum — see the mapping table in `backend/src/cases/cases.service.ts`.
- **Login flow**: the frontend does a 2-step login (`POST /auth/login` → `POST /auth/mfa/verify`) that the backend bridges to a real Keycloak password-grant underneath — see `backend/src/auth/auth.service.ts` for the full explanation.

## Known gaps — flag these to the right teammate

- **MFA is UI-only** — no real TOTP is configured in Keycloak yet. If a real second factor matters for the demo, that's Dharani's realm config to add.
- **Signature certificate IDs are placeholders** — blockchain-api's `/signatures/sign` response doesn't echo back a real certificate reference, so the backend generates one to satisfy the database's `NOT NULL` constraint. Flag to Dharani if judges will inspect this specifically.
- **Elasticsearch isn't wired into search yet** — infra is running, but `/documents` still queries Postgres directly. This was originally scoped as Deepak's territory (AI/search service) per the team plan.
- **`GET /cases/:id/documents` and a few other endpoints don't have dedicated test coverage** — the full backend was rewritten in one pass against real contracts from all three teammates; run through the actual demo flow once end-to-end before presenting, the way you would with any newly-integrated system.

## Repo layout

```
sentineldms/
├── backend/       Balavignesh — NestJS API
├── frontend/      Dineshkarthick — React/Vite UI
├── database/      Arunkumar — real Postgres schema, seed data, ES mapping
├── blockchain/     Dharani Dharan — Fabric chaincode, blockchain-api, Keycloak realm
├── keycloak/       realm-export.json used by docker-compose (copy of blockchain/keycloak/, kept in sync)
├── shared-storage/ gitignored — local file mirror bridging backend <-> blockchain-api
└── docker-compose.yml   merged infra: Postgres, Redis, MinIO, Elasticsearch, Kibana, Keycloak
```
