# SentinelDMS — Database Layer

**Owner:** Arunkumar (Database Engineer)  
**Project:** SIH 2026 | Problem Statement 26190 | Ministry of Home Affairs — NCRB

---

## What's in this folder

```
sentineldms-db/
├── migrations/
│   └── 001_initial_schema.sql       ← Full PostgreSQL schema (run first)
├── seeds/
│   └── 001_seed_data.sql            ← Sample data for dev/testing
├── config/
│   └── elasticsearch_mapping.json   ← ES index mapping (share with Deepak)
├── scripts/
│   └── bootstrap.sh                 ← One-command setup script
├── docker-compose.yml               ← All data services
└── README.md                        ← This file
```

---

## Quick Start (Day 1)

```bash
# 1. Start all services
docker compose up -d

# 2. Wait ~30 seconds for services to be healthy, then:
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh

# 3. Verify
psql -h localhost -U sentinel -d sentineldms -c "\dt"
```

---

## Tables Overview

| Table | Purpose |
|---|---|
| `roles` | Permission definitions (JSONB array of strings) |
| `users` | Officers, judges, forensic experts, admins |
| `cases` | FIR/investigation cases with status tracking |
| `documents` | Documents linked to cases |
| `document_versions` | Each file version with SHA-256 hash + MinIO path |
| `digital_signatures` | PKI/DSC signatures per version |
| `blockchain_anchors` | Hyperledger Fabric Tx IDs + anchored hashes |
| `chain_of_custody` | Every access/transfer event per document |
| `audit_logs` | System-wide action log (who did what, when) |
| `notifications` | In-app alerts per user |
| `workflows` | Approval flows linking cases/documents to reviewers |
| `document_shares` | Expiring inter-department shares |
| `ocr_results` | Extracted text from Tesseract OCR |
| `ai_classifications` | IndicBERT classification + entity extraction results |
| `tamper_checks` | Hash comparison results against blockchain anchors |

---

## Useful Views

| View | What it gives you |
|---|---|
| `vw_documents_current` | Every document with its latest version + case info |
| `vw_user_activity_30d` | Per-user action counts for the audit dashboard |
| `vw_custody_summary` | Chain-of-custody summary per document |

---

## MinIO Bucket Structure

```
sentineldms/
  cases/{case_id}/
    documents/{document_id}/
      v{version_number}/
        {original_filename}
```

- Server-side encryption (SSE) enabled on bucket.
- Versioning enabled (double protection alongside `document_versions` table).
- Access only via presigned URLs from Balavignesh's backend. MinIO is never exposed to the frontend directly.

---

## Redis Key Conventions

| Key Pattern | TTL | Purpose |
|---|---|---|
| `session:{session_id}` | 1h | User session state (backs Keycloak) |
| `ratelimit:upload:{user_id}` | 1h | Upload rate limiting counter |
| `ratelimit:search:{user_id}` | 1m | Search rate limiting counter |
| `cache:dashboard:{user_id}` | 5m | Dashboard stat aggregates |
| `cache:doc:{document_id}` | 10m | Recently viewed document metadata |

Invalidation rule: any write to `documents` or `cases` must delete the relevant `cache:*` keys.

---

## Elasticsearch Index

- **Index name:** `sentineldms_documents`
- **Who writes:** Deepak's OCR/classify pipeline pushes the indexed payload directly. Arunkumar does NOT duplicate the write. (Confirm this with Deepak — see `config/elasticsearch_mapping.json`.)
- Supports full-text search + Hindi (`hindi_analyzer`) + keyword filters.

---

## Demo Tamper Detection Scenario

The seed includes a deliberately "tampered" document:

- **Document:** `Witness Statement — Arun Mehta` (Case CR-2026-CCB-00456)
- **document_version_id:** `e1000000-0000-0000-0000-000000000006`
- **Stored file hash (after tampering):** `f8f9e0d1...`
- **Blockchain anchored hash (original):** `99aabb0c...`
- A `tamper_checks` row already records `is_tampered = TRUE`

Use this for the live demo moment: query `tamper_checks WHERE is_tampered = TRUE` and show the hash mismatch on screen.

---

## Dependencies (coordinate with teammates)

### You need from:
| Person | What |
|---|---|
| Balavignesh | Agree on Prisma vs raw SQL as source-of-truth (Day 1). He may already have docker-compose started — don't duplicate services. |
| Deepak | Confirm who writes to Elasticsearch index (settle before Week 2). |

### Teammates need from you:
| Person | What | When |
|---|---|---|
| Balavignesh | Finalized schema | **End of Week 1** — he's blocked on Document/Case modules without it |
| Dharani Dharan | `document_versions.file_hash` column + `blockchain_anchors` table structure | Week 1 |

---

## Connection Strings

```
PostgreSQL:    postgresql://sentinel:sentinel_secret_change_in_prod@localhost:5432/sentineldms
Redis:         redis://:redis_secret_change_in_prod@localhost:6379
MinIO (S3):    http://localhost:9000  (key: sentinel_minio / minio_secret_change_in_prod)
Elasticsearch: http://localhost:9200
Kibana:        http://localhost:5601
```

**Change all passwords before staging/demo deployment.**

---

## Backup (mention in report even if not fully implemented in prototype)

- Daily `pg_dump`: `pg_dump -U sentinel sentineldms | gzip > backup_$(date +%F).sql.gz`
- WAL archiving for point-in-time recovery (configure `postgresql.conf` in production)
- MinIO versioning is already enabled via the `minio_init` container
