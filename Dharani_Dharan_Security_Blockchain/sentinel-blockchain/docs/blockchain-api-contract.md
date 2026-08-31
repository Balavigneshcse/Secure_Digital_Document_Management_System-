# blockchain-api — API Contract

Base URL (local dev): `http://localhost:4000`

## Blockchain endpoints

### `POST /blockchain/anchor`

Anchors a document version's hash on the ledger. Call this synchronously
during document upload, right after the file is hashed and stored.

**Request body:**
```json
{
  "documentId": "DOC-001",
  "versionId": "v1",
  "hash": "<sha256 hex digest>",
  "uploaderId": "officer-123"
}
```

**Response (201):**
```json
{
  "txId": "abc123...",
  "blockNumber": null,
  "anchoredAt": "2026-08-31T10:00:00.000Z"
}
```
`blockNumber` is `null` in the prototype — see note in `routes/blockchain.js`.

---

### `GET /blockchain/verify/:documentId/:versionId`

Recomputes the hash of the file currently in storage and compares it to the
on-chain anchor. This is the core tamper-detection call.

**Response (200):**
```json
{
  "isValid": true,
  "storedHash": "<hash on-chain>",
  "currentHash": "<hash of file right now>",
  "anchoredAt": "2026-08-31T10:00:00.000Z"
}
```

---

### `GET /blockchain/audit/:documentId`

Returns every anchor event for a document across all versions (for the audit
dashboard module).

**Response (200):**
```json
{
  "documentId": "DOC-001",
  "history": [
    { "documentId": "DOC-001", "versionId": "v1", "hash": "...", "uploaderId": "...", "timestamp": "...", "txId": "..." }
  ]
}
```

## Signature endpoints

### `POST /signatures/sign`

**Request body:**
```json
{
  "documentVersionId": "DOC-001_v1",
  "userId": "officer-123",
  "certificateId": "optional — reserved for future real DSC/eSign integration"
}
```

**Response (201):**
```json
{
  "signatureValue": "<base64 signature>",
  "signedAt": "2026-08-31T10:05:00.000Z"
}
```

---

### `GET /signatures/:documentVersionId/verify`

**Response (200):**
```json
{
  "isValid": true,
  "signedBy": "officer-123",
  "signedAt": "2026-08-31T10:05:00.000Z"
}
```

## Dependencies / integration notes

- **From document-service (Arunkumar/Balavignesh):** confirm the exact
  `document_versions` / `blockchain_anchors` table shape so results from
  `/anchor` can be written back correctly, and confirm this service is
  called **synchronously** during upload (per the working doc's
  recommendation for the prototype).
- **Storage path resolution:** `hashService.resolveStoredFilePath()` assumes
  `<DOCUMENT_STORAGE_PATH>/<documentId>/<versionId>`. Update that one function
  once the real MinIO/S3 key structure is finalized — nothing else needs to
  change.
