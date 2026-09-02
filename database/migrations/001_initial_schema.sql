-- ============================================================
-- SentinelDMS — PostgreSQL 15+ Schema
-- Migration: 001_initial_schema.sql
-- Project: SIH 2026 | Ministry of Home Affairs — NCRB
-- Author: Arunkumar (Database Engineer)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TYPE case_status AS ENUM (
  'open', 'under_investigation', 'pending_review',
  'closed', 'archived', 'reopened'
);

CREATE TYPE document_type AS ENUM (
  'fir', 'chargesheet', 'witness_statement', 'forensic_report',
  'court_order', 'arrest_memo', 'evidence_photo', 'medical_report',
  'legal_notice', 'affidavit', 'other'
);

CREATE TYPE signature_status AS ENUM (
  'unsigned', 'pending', 'signed', 'rejected', 'expired'
);

CREATE TYPE custody_action AS ENUM (
  'created', 'viewed', 'downloaded', 'transferred',
  'edited', 'signed', 'archived', 'restored', 'deleted'
);

CREATE TYPE notification_type AS ENUM (
  'document_uploaded', 'document_signed', 'case_updated',
  'access_granted', 'access_revoked', 'tamper_detected',
  'signature_requested', 'workflow_approved', 'workflow_rejected',
  'system_alert'
);

CREATE TYPE workflow_status AS ENUM (
  'pending', 'in_review', 'approved', 'rejected', 'escalated'
);

CREATE TYPE sharing_status AS ENUM (
  'active', 'expired', 'revoked'
);

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  permissions   JSONB NOT NULL DEFAULT '[]',
  -- e.g. ["document:read","document:upload","document:sign",
  --        "case:create","case:approve","audit:view","admin:manage"]
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,  -- system roles can't be deleted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN roles.permissions IS
  'JSON array of permission strings, e.g. ["document:read","case:approve"]';

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               VARCHAR(255) NOT NULL,
  email              VARCHAR(255) NOT NULL UNIQUE,
  badge_number       VARCHAR(100) UNIQUE,           -- for police officers
  role_id            UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  department         VARCHAR(255),
  designation        VARCHAR(255),
  station_code       VARCHAR(100),                  -- police station identifier
  keycloak_id        VARCHAR(255) UNIQUE,           -- Keycloak user ID for SSO
  mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  status             user_status NOT NULL DEFAULT 'active',
  last_login_at      TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role_id     ON users(role_id);
CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_status      ON users(status);
CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);

-- ============================================================
-- TABLE: cases
-- ============================================================
CREATE TABLE cases (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number   VARCHAR(100) NOT NULL UNIQUE,   -- e.g. CR-2026-MHR-00123
  title         VARCHAR(500) NOT NULL,
  description   TEXT,
  status        case_status NOT NULL DEFAULT 'open',
  department    VARCHAR(255),
  station_code  VARCHAR(100),
  jurisdiction  VARCHAR(255),
  filed_date    DATE,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at     TIMESTAMPTZ,
  archived_at   TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}',   -- flexible extra fields
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_status       ON cases(status);
CREATE INDEX idx_cases_created_by   ON cases(created_by);
CREATE INDEX idx_cases_assigned_to  ON cases(assigned_to);
CREATE INDEX idx_cases_case_number  ON cases(case_number);
CREATE INDEX idx_cases_department   ON cases(department);
CREATE INDEX idx_cases_filed_date   ON cases(filed_date);

-- ============================================================
-- TABLE: documents
-- ============================================================
CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id             UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  title               VARCHAR(500) NOT NULL,
  document_type       document_type NOT NULL DEFAULT 'other',
  current_version_id  UUID,                          -- FK set after first version insert
  uploaded_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signature_status    signature_status NOT NULL DEFAULT 'unsigned',
  is_confidential     BOOLEAN NOT NULL DEFAULT FALSE,
  language            VARCHAR(50) DEFAULT 'en',      -- document language (en, hi, ta, etc.)
  ocr_processed       BOOLEAN NOT NULL DEFAULT FALSE,
  ai_classified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at         TIMESTAMPTZ,
  tags                TEXT[] DEFAULT '{}',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_case_id         ON documents(case_id);
CREATE INDEX idx_documents_uploaded_by     ON documents(uploaded_by);
CREATE INDEX idx_documents_document_type   ON documents(document_type);
CREATE INDEX idx_documents_signature_status ON documents(signature_status);
CREATE INDEX idx_documents_is_archived     ON documents(is_archived);
CREATE INDEX idx_documents_tags            ON documents USING GIN(tags);
CREATE INDEX idx_documents_metadata        ON documents USING GIN(metadata);

-- ============================================================
-- TABLE: document_versions
-- ============================================================
CREATE TABLE document_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  file_path       VARCHAR(1000) NOT NULL,    -- MinIO object key
  file_hash       CHAR(64) NOT NULL,         -- SHA-256 hex digest (64 chars)
  file_size       BIGINT NOT NULL,           -- bytes
  mime_type       VARCHAR(255),
  original_filename VARCHAR(500),
  encryption_key_id VARCHAR(255),            -- reference to key in KMS/Vault
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  change_notes    TEXT,                      -- optional note about this version
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, version_number)
);

CREATE INDEX idx_doc_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_doc_versions_file_hash   ON document_versions(file_hash);
CREATE INDEX idx_doc_versions_created_by  ON document_versions(created_by);

-- Now set the FK on documents.current_version_id
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_current_version
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- TABLE: digital_signatures
-- ============================================================
CREATE TABLE digital_signatures (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_version_id  UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  signed_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  certificate_id       VARCHAR(500) NOT NULL,    -- X.509 cert serial / DSC ID
  certificate_subject  VARCHAR(1000),            -- Distinguished Name from cert
  signature_value      TEXT NOT NULL,            -- base64-encoded signature bytes
  signing_algorithm    VARCHAR(100) DEFAULT 'SHA256withRSA',
  is_valid             BOOLEAN NOT NULL DEFAULT TRUE,
  invalidated_at       TIMESTAMPTZ,
  invalidation_reason  TEXT,
  signed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signatures_doc_version_id ON digital_signatures(document_version_id);
CREATE INDEX idx_signatures_signed_by      ON digital_signatures(signed_by);
CREATE INDEX idx_signatures_signed_at      ON digital_signatures(signed_at);

-- ============================================================
-- TABLE: blockchain_anchors
-- ============================================================
CREATE TABLE blockchain_anchors (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_version_id  UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  tx_id                VARCHAR(500) NOT NULL UNIQUE,   -- Hyperledger Fabric Tx ID
  block_number         BIGINT,
  channel_name         VARCHAR(255) DEFAULT 'sentinel-channel',
  chaincode_name       VARCHAR(255) DEFAULT 'sentinel-cc',
  anchored_hash        CHAR(64) NOT NULL,              -- SHA-256 of the file at anchor time
  anchor_payload       JSONB,                          -- full payload submitted to chain
  anchor_status        VARCHAR(50) DEFAULT 'confirmed',-- pending | confirmed | failed
  anchored_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blockchain_anchors_doc_version_id ON blockchain_anchors(document_version_id);
CREATE INDEX idx_blockchain_anchors_tx_id          ON blockchain_anchors(tx_id);
CREATE INDEX idx_blockchain_anchors_anchored_hash  ON blockchain_anchors(anchored_hash);

-- ============================================================
-- TABLE: chain_of_custody
-- ============================================================
CREATE TABLE chain_of_custody (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  handler_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action       custody_action NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- for 'transferred'
  to_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,  -- for 'transferred'
  location     VARCHAR(500),         -- physical/digital location note
  device_info  VARCHAR(500),         -- browser/device used
  ip_address   INET,
  notes        TEXT,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custody_document_id  ON chain_of_custody(document_id);
CREATE INDEX idx_custody_handler_id   ON chain_of_custody(handler_id);
CREATE INDEX idx_custody_timestamp    ON chain_of_custody(timestamp DESC);
CREATE INDEX idx_custody_action       ON chain_of_custody(action);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id    VARCHAR(255),
  action        VARCHAR(255) NOT NULL,     -- e.g. 'document.upload', 'case.status_change'
  resource_type VARCHAR(100),              -- 'document' | 'case' | 'user' | 'system'
  resource_id   UUID,
  old_value     JSONB,                     -- before state (for updates)
  new_value     JSONB,                     -- after state
  ip_address    INET,
  user_agent    TEXT,
  success       BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id        ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp      ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_resource       ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action         ON audit_logs(action);

-- Partition audit_logs by month for performance at scale
-- (Uncomment this in production when the table grows large)
-- CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              notification_type NOT NULL,
  title             VARCHAR(500) NOT NULL,
  message           TEXT NOT NULL,
  related_resource_type VARCHAR(100),
  related_resource_id   UUID,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX idx_notifications_is_read     ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at  ON notifications(created_at DESC);

-- ============================================================
-- TABLE: workflows
-- Approval workflows linking cases/documents to reviewers
-- ============================================================
CREATE TABLE workflows (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id       UUID REFERENCES cases(id) ON DELETE CASCADE,
  document_id   UUID REFERENCES documents(id) ON DELETE CASCADE,
  initiated_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status        workflow_status NOT NULL DEFAULT 'pending',
  workflow_type VARCHAR(100) NOT NULL,    -- e.g. 'document_approval', 'case_closure'
  priority      SMALLINT DEFAULT 2,       -- 1=high, 2=medium, 3=low
  due_date      TIMESTAMPTZ,
  notes         TEXT,
  resolved_at   TIMESTAMPTZ,
  resolution_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (case_id IS NOT NULL OR document_id IS NOT NULL)
);

CREATE INDEX idx_workflows_case_id     ON workflows(case_id);
CREATE INDEX idx_workflows_document_id ON workflows(document_id);
CREATE INDEX idx_workflows_assigned_to ON workflows(assigned_to);
CREATE INDEX idx_workflows_status      ON workflows(status);

-- ============================================================
-- TABLE: document_shares
-- Expiring / scoped inter-department document sharing
-- ============================================================
CREATE TABLE document_shares (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shared_with   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token   VARCHAR(500) UNIQUE,              -- token for presigned-URL type access
  permissions   TEXT[] DEFAULT ARRAY['read'],     -- ['read'] | ['read','download']
  expires_at    TIMESTAMPTZ,
  status        sharing_status NOT NULL DEFAULT 'active',
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shares_document_id  ON document_shares(document_id);
CREATE INDEX idx_shares_shared_with  ON document_shares(shared_with);
CREATE INDEX idx_shares_expires_at   ON document_shares(expires_at);
CREATE INDEX idx_shares_status       ON document_shares(status);

-- ============================================================
-- TABLE: ocr_results
-- Stores extracted text from document versions
-- ============================================================
CREATE TABLE ocr_results (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_version_id  UUID NOT NULL UNIQUE REFERENCES document_versions(id) ON DELETE CASCADE,
  extracted_text       TEXT,
  language_detected    VARCHAR(50),
  confidence_score     DECIMAL(5,4),      -- 0.0000 to 1.0000
  processing_engine    VARCHAR(100) DEFAULT 'tesseract',
  processing_duration_ms INTEGER,
  error_message        TEXT,
  processed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ocr_doc_version_id ON ocr_results(document_version_id);

-- ============================================================
-- TABLE: ai_classifications
-- AI-generated document classification and entity extraction
-- ============================================================
CREATE TABLE ai_classifications (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id          UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id  UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  predicted_type       document_type,
  confidence_score     DECIMAL(5,4),
  extracted_entities   JSONB DEFAULT '{}',
  -- e.g. {"names":["Ramesh Kumar"],"dates":["2026-01-15"],"case_numbers":["CR-2026-001"]}
  tags_suggested       TEXT[] DEFAULT '{}',
  model_name           VARCHAR(255),
  model_version        VARCHAR(100),
  is_accepted          BOOLEAN DEFAULT NULL,    -- NULL=pending human review
  reviewed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  processed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_class_document_id ON ai_classifications(document_id);
CREATE INDEX idx_ai_class_entities    ON ai_classifications USING GIN(extracted_entities);

-- ============================================================
-- TABLE: tamper_checks
-- Records of hash verification against blockchain anchors
-- ============================================================
CREATE TABLE tamper_checks (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_version_id  UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  blockchain_anchor_id UUID REFERENCES blockchain_anchors(id) ON DELETE SET NULL,
  checked_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  current_hash         CHAR(64) NOT NULL,    -- hash computed at check time
  anchored_hash        CHAR(64) NOT NULL,    -- hash stored in blockchain_anchors
  is_tampered          BOOLEAN NOT NULL,     -- TRUE if hashes differ
  check_notes          TEXT,
  checked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tamper_checks_doc_version_id ON tamper_checks(document_version_id);
CREATE INDEX idx_tamper_checks_is_tampered    ON tamper_checks(is_tampered);
CREATE INDEX idx_tamper_checks_checked_at     ON tamper_checks(checked_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Latest version of every document with its hash
CREATE VIEW vw_documents_current AS
SELECT
  d.id                  AS document_id,
  d.case_id,
  d.title,
  d.document_type,
  d.signature_status,
  d.is_confidential,
  d.tags,
  d.ocr_processed,
  d.ai_classified,
  dv.id                 AS version_id,
  dv.version_number,
  dv.file_path,
  dv.file_hash,
  dv.file_size,
  dv.mime_type,
  dv.created_at         AS version_created_at,
  u.name                AS uploaded_by_name,
  u.email               AS uploaded_by_email,
  c.case_number,
  c.title               AS case_title
FROM documents d
JOIN document_versions dv ON d.current_version_id = dv.id
JOIN users u              ON d.uploaded_by = u.id
JOIN cases c              ON d.case_id = c.id
WHERE d.is_archived = FALSE;

-- View: Audit summary per user (last 30 days)
CREATE VIEW vw_user_activity_30d AS
SELECT
  u.id       AS user_id,
  u.name,
  u.email,
  u.department,
  COUNT(al.id)                                                 AS total_actions,
  COUNT(al.id) FILTER (WHERE al.success = FALSE)               AS failed_actions,
  COUNT(al.id) FILTER (WHERE al.action LIKE 'document.%')      AS document_actions,
  MAX(al.timestamp)                                            AS last_action_at
FROM users u
LEFT JOIN audit_logs al ON al.user_id = u.id
  AND al.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name, u.email, u.department;

-- View: Chain of custody summary per document
CREATE VIEW vw_custody_summary AS
SELECT
  d.id           AS document_id,
  d.title,
  c.case_number,
  COUNT(cc.id)   AS total_custody_events,
  MIN(cc.timestamp) AS first_event_at,
  MAX(cc.timestamp) AS last_event_at,
  ARRAY_AGG(DISTINCT u.name ORDER BY u.name) AS handlers
FROM documents d
JOIN cases c          ON d.case_id = c.id
LEFT JOIN chain_of_custody cc ON cc.document_id = d.id
LEFT JOIN users u     ON cc.handler_id = u.id
GROUP BY d.id, d.title, c.case_number;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-create audit log on user login update
CREATE OR REPLACE FUNCTION fn_audit_sensitive_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value)
  VALUES (
    NEW.id,
    TG_TABLE_NAME || '.update',
    TG_TABLE_NAME,
    NEW.id,
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: log whenever a user's role or status changes
CREATE TRIGGER trg_audit_user_role_change
  AFTER UPDATE OF role_id, status ON users
  FOR EACH ROW
  WHEN (OLD.role_id IS DISTINCT FROM NEW.role_id
        OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_audit_sensitive_change();
