-- ============================================================
-- SentinelDMS — Seed Data
-- File: 001_seed_data.sql
-- Provides ~10 users, roles, cases, documents, and audit data
-- for the whole team to test against.
-- ============================================================

-- ============================================================
-- ROLES (system roles)
-- ============================================================
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'Super Admin',
  'Full system access, user management, audit access',
  '["admin:manage","user:create","user:update","user:delete",
    "role:manage","case:create","case:read","case:update","case:delete",
    "document:create","document:read","document:update","document:delete",
    "document:sign","document:share","audit:view","blockchain:view","system:config"]'::jsonb,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000002',
  'Investigating Officer',
  'Create cases, upload and view documents, sign reports',
  '["case:create","case:read","case:update",
    "document:create","document:read","document:update","document:sign",
    "custody:create","custody:read","audit:view_own"]'::jsonb,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000003',
  'Forensic Expert',
  'View and upload forensic reports, cannot modify case status',
  '["case:read","document:create","document:read",
    "document:sign","custody:read","audit:view_own"]'::jsonb,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000004',
  'Judicial Officer',
  'Read-only access to assigned cases, can approve workflows',
  '["case:read","document:read","document:sign",
    "workflow:approve","audit:view"]'::jsonb,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000005',
  'Department Head',
  'Review and approve case closures, view audit logs',
  '["case:read","case:approve","document:read",
    "workflow:approve","audit:view","report:export"]'::jsonb,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000006',
  'Read Only',
  'View access only — for court-assigned observers',
  '["case:read","document:read"]'::jsonb,
  TRUE
);

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (id, name, email, badge_number, role_id, department, designation, station_code, mfa_enabled, status) VALUES
(
  'b1000000-0000-0000-0000-000000000001',
  'Rajesh Kumar',
  'rajesh.kumar@ncrb.gov.in',
  'MHR-001',
  'a1000000-0000-0000-0000-000000000001',
  'IT Administration',
  'System Administrator',
  'HQ-DELHI',
  TRUE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000002',
  'Priya Sharma',
  'priya.sharma@ncrb.gov.in',
  'MHR-042',
  'a1000000-0000-0000-0000-000000000002',
  'Crime Branch',
  'Sub Inspector',
  'PS-DELHI-21',
  TRUE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000003',
  'Arjun Nair',
  'arjun.nair@ncrb.gov.in',
  'MHR-087',
  'a1000000-0000-0000-0000-000000000002',
  'Women Safety Division',
  'Inspector',
  'PS-MUMBAI-07',
  TRUE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000004',
  'Dr. Meena Iyer',
  'meena.iyer@forensics.gov.in',
  NULL,
  'a1000000-0000-0000-0000-000000000003',
  'Forensic Science Lab',
  'Senior Forensic Analyst',
  'FSL-CHENNAI',
  FALSE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000005',
  'Justice Ramkumar',
  'ramkumar@judiciary.gov.in',
  NULL,
  'a1000000-0000-0000-0000-000000000004',
  'District Court — Delhi',
  'Additional Sessions Judge',
  'COURT-DELHI-ASJ-3',
  TRUE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000006',
  'Suresh Babu',
  'suresh.babu@ncrb.gov.in',
  'MHR-010',
  'a1000000-0000-0000-0000-000000000005',
  'Crime Branch',
  'DCP',
  'HQ-DELHI',
  TRUE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000007',
  'Lakshmi Devi',
  'lakshmi.devi@ncrb.gov.in',
  'MHR-063',
  'a1000000-0000-0000-0000-000000000002',
  'Women Safety Division',
  'Head Constable',
  'PS-BANGALORE-12',
  FALSE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000008',
  'Vikram Singh',
  'vikram.singh@forensics.gov.in',
  NULL,
  'a1000000-0000-0000-0000-000000000003',
  'Forensic Science Lab',
  'Fingerprint Expert',
  'FSL-DELHI',
  FALSE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000009',
  'Anitha Krishnan',
  'anitha.krishnan@ncrb.gov.in',
  'MHR-155',
  'a1000000-0000-0000-0000-000000000002',
  'Cyber Crime Cell',
  'SI (Cyber)',
  'PS-HYDERABAD-CC',
  TRUE,
  'active'
),
(
  'b1000000-0000-0000-0000-000000000010',
  'Court Observer',
  'observer@judiciary.gov.in',
  NULL,
  'a1000000-0000-0000-0000-000000000006',
  'Judiciary',
  'Law Clerk',
  'COURT-DELHI-HC',
  FALSE,
  'active'
);

-- ============================================================
-- CASES
-- ============================================================
INSERT INTO cases (id, case_number, title, description, status, department, station_code, filed_date, created_by, assigned_to) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'CR-2026-WSD-00123',
  'Online Harassment — Victim: Sunita Rao',
  'Victim reported sustained online harassment via WhatsApp and Instagram over 3 months. Multiple screenshots and evidence collected.',
  'under_investigation',
  'Women Safety Division',
  'PS-DELHI-21',
  '2026-02-10',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000002'
),
(
  'c1000000-0000-0000-0000-000000000002',
  'CR-2026-CCB-00456',
  'Financial Fraud — Raman Enterprises',
  'Alleged bank fraud of Rs. 4.2 crores involving forged documents. FIR lodged after EOW referral.',
  'open',
  'Crime Branch',
  'PS-MUMBAI-07',
  '2026-03-01',
  'b1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000003'
),
(
  'c1000000-0000-0000-0000-000000000003',
  'CR-2026-CC-00789',
  'Ransomware Attack — State Hospital Network',
  'Critical infrastructure cyberattack affecting hospital records. Investigation by Cyber Crime Cell.',
  'under_investigation',
  'Cyber Crime Cell',
  'PS-HYDERABAD-CC',
  '2026-04-05',
  'b1000000-0000-0000-0000-000000000009',
  'b1000000-0000-0000-0000-000000000009'
),
(
  'c1000000-0000-0000-0000-000000000004',
  'CR-2025-MHR-09901',
  'Murder Investigation — Rajpur Area (Closed)',
  'Homicide case closed after conviction. All evidence and documents archived for records.',
  'archived',
  'Crime Branch',
  'PS-DELHI-21',
  '2025-08-14',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000006'
),
(
  'c1000000-0000-0000-0000-000000000005',
  'CR-2026-WSD-00200',
  'Domestic Violence — Anonymous Complaint',
  'Anonymous tip received via helpline. IO assigned for initial inquiry.',
  'open',
  'Women Safety Division',
  'PS-BANGALORE-12',
  '2026-06-20',
  'b1000000-0000-0000-0000-000000000007',
  'b1000000-0000-0000-0000-000000000007'
);

-- ============================================================
-- DOCUMENT VERSIONS (insert before documents due to FK cycle)
-- We'll use a two-step approach: insert versions with placeholder
-- document_id references, then link back.
-- ============================================================

-- Step 1: Insert documents without current_version_id
INSERT INTO documents (id, case_id, title, document_type, uploaded_by, signature_status, ocr_processed, ai_classified, language, tags) VALUES
(
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'First Information Report — CR-2026-WSD-00123',
  'fir',
  'b1000000-0000-0000-0000-000000000002',
  'signed',
  TRUE,
  TRUE,
  'hi',
  ARRAY['fir','harassment','digital-evidence']
),
(
  'd1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  'WhatsApp Message Screenshots — Exhibit A',
  'evidence_photo',
  'b1000000-0000-0000-0000-000000000002',
  'unsigned',
  FALSE,
  TRUE,
  'en',
  ARRAY['screenshot','digital-evidence','exhibit']
),
(
  'd1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  'Forensic Analysis Report — Device Examination',
  'forensic_report',
  'b1000000-0000-0000-0000-000000000004',
  'signed',
  TRUE,
  TRUE,
  'en',
  ARRAY['forensics','digital-device','examination']
),
(
  'd1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000002',
  'FIR — Financial Fraud CR-2026-CCB-00456',
  'fir',
  'b1000000-0000-0000-0000-000000000003',
  'signed',
  TRUE,
  TRUE,
  'en',
  ARRAY['fir','fraud','financial']
),
(
  'd1000000-0000-0000-0000-000000000005',
  'c1000000-0000-0000-0000-000000000002',
  'Bank Statement — Raman Enterprises (Jan–Dec 2025)',
  'legal_notice',
  'b1000000-0000-0000-0000-000000000003',
  'unsigned',
  TRUE,
  FALSE,
  'en',
  ARRAY['bank-statement','financial','exhibit']
),
(
  -- This document will be "tampered" — used for the live demo
  'd1000000-0000-0000-0000-000000000006',
  'c1000000-0000-0000-0000-000000000002',
  'Witness Statement — Arun Mehta [TAMPERED — DEMO]',
  'witness_statement',
  'b1000000-0000-0000-0000-000000000003',
  'unsigned',
  TRUE,
  TRUE,
  'en',
  ARRAY['witness','statement','demo']
),
(
  'd1000000-0000-0000-0000-000000000007',
  'c1000000-0000-0000-0000-000000000003',
  'Incident Report — Ransomware CR-2026-CC-00789',
  'forensic_report',
  'b1000000-0000-0000-0000-000000000009',
  'unsigned',
  TRUE,
  TRUE,
  'en',
  ARRAY['cyber','ransomware','incident-report']
),
(
  'd1000000-0000-0000-0000-000000000008',
  'c1000000-0000-0000-0000-000000000004',
  'Final Chargesheet — CR-2025-MHR-09901',
  'chargesheet',
  'b1000000-0000-0000-0000-000000000002',
  'signed',
  TRUE,
  TRUE,
  'hi',
  ARRAY['chargesheet','closed-case','archived']
);

-- Step 2: Insert document versions
INSERT INTO document_versions (id, document_id, version_number, file_path, file_hash, file_size, mime_type, original_filename, created_by) VALUES
(
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  1,
  'cases/c1000000-0000-0000-0000-000000000001/documents/d1000000-0000-0000-0000-000000000001/v1/FIR_CR2026WSD00123.pdf',
  'a3f4e5d6c7b8a9012345678901234567890123456789012345678901234567890123',
  204800,
  'application/pdf',
  'FIR_CR2026WSD00123.pdf',
  'b1000000-0000-0000-0000-000000000002'
),
(
  'e1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000002',
  1,
  'cases/c1000000-0000-0000-0000-000000000001/documents/d1000000-0000-0000-0000-000000000002/v1/WhatsApp_Screenshots.zip',
  'b4f5e6d7c8a9b0123456789012345678901234567890123456789012345678901234',
  1048576,
  'application/zip',
  'WhatsApp_Screenshots.zip',
  'b1000000-0000-0000-0000-000000000002'
),
(
  'e1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000003',
  1,
  'cases/c1000000-0000-0000-0000-000000000001/documents/d1000000-0000-0000-0000-000000000003/v1/Forensic_Report_DeviceExam.pdf',
  'c5f6e7d8b9a0c1234567890123456789012345678901234567890123456789012345',
  512000,
  'application/pdf',
  'Forensic_Report_DeviceExam.pdf',
  'b1000000-0000-0000-0000-000000000004'
),
(
  'e1000000-0000-0000-0000-000000000004',
  'd1000000-0000-0000-0000-000000000004',
  1,
  'cases/c1000000-0000-0000-0000-000000000002/documents/d1000000-0000-0000-0000-000000000004/v1/FIR_CR2026CCB00456.pdf',
  'd6f7e8d9a0b1c2345678901234567890123456789012345678901234567890123456',
  184320,
  'application/pdf',
  'FIR_CR2026CCB00456.pdf',
  'b1000000-0000-0000-0000-000000000003'
),
(
  'e1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000005',
  1,
  'cases/c1000000-0000-0000-0000-000000000002/documents/d1000000-0000-0000-0000-000000000005/v1/Bank_Statement_2025.pdf',
  'e7f8e9d0a1b2c3456789012345678901234567890123456789012345678901234567',
  307200,
  'application/pdf',
  'Bank_Statement_2025.pdf',
  'b1000000-0000-0000-0000-000000000003'
),
(
  -- TAMPERED document: the stored hash won't match the blockchain anchor (demo scenario)
  'e1000000-0000-0000-0000-000000000006',
  'd1000000-0000-0000-0000-000000000006',
  1,
  'cases/c1000000-0000-0000-0000-000000000002/documents/d1000000-0000-0000-0000-000000000006/v1/Witness_Arun_Mehta.pdf',
  'f8f9e0d1a2b3c4567890123456789012345678901234567890123456789012345678',  -- hash AFTER tampering
  92160,
  'application/pdf',
  'Witness_Arun_Mehta.pdf',
  'b1000000-0000-0000-0000-000000000003'
),
(
  'e1000000-0000-0000-0000-000000000007',
  'd1000000-0000-0000-0000-000000000007',
  1,
  'cases/c1000000-0000-0000-0000-000000000003/documents/d1000000-0000-0000-0000-000000000007/v1/Incident_Report_Ransomware.pdf',
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  409600,
  'application/pdf',
  'Incident_Report_Ransomware.pdf',
  'b1000000-0000-0000-0000-000000000009'
),
(
  'e1000000-0000-0000-0000-000000000008',
  'd1000000-0000-0000-0000-000000000008',
  1,
  'cases/c1000000-0000-0000-0000-000000000004/documents/d1000000-0000-0000-0000-000000000008/v1/Chargesheet_CR2025MHR09901.pdf',
  'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
  614400,
  'application/pdf',
  'Chargesheet_CR2025MHR09901.pdf',
  'b1000000-0000-0000-0000-000000000002'
);

-- Step 3: Link documents to their current versions
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000001' WHERE id = 'd1000000-0000-0000-0000-000000000001';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000002' WHERE id = 'd1000000-0000-0000-0000-000000000002';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000003' WHERE id = 'd1000000-0000-0000-0000-000000000003';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000004' WHERE id = 'd1000000-0000-0000-0000-000000000004';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000005' WHERE id = 'd1000000-0000-0000-0000-000000000005';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000006' WHERE id = 'd1000000-0000-0000-0000-000000000006';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000007' WHERE id = 'd1000000-0000-0000-0000-000000000007';
UPDATE documents SET current_version_id = 'e1000000-0000-0000-0000-000000000008' WHERE id = 'd1000000-0000-0000-0000-000000000008';

-- Mark archived case's document as archived
UPDATE documents SET is_archived = TRUE, archived_at = NOW() WHERE id = 'd1000000-0000-0000-0000-000000000008';

-- ============================================================
-- BLOCKCHAIN ANCHORS
-- ============================================================
INSERT INTO blockchain_anchors (id, document_version_id, tx_id, block_number, anchored_hash, anchor_status) VALUES
(
  'f1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'TX-FABRIC-A3F4E5D6C7B8A901234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
  1042,
  'a3f4e5d6c7b8a9012345678901234567890123456789012345678901234567890123',
  'confirmed'
),
(
  'f1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'TX-FABRIC-C5F6E7D8B9A0C123456789012ABCDEF1234567890ABCDEF1234567890ABCDEF1234',
  1089,
  'c5f6e7d8b9a0c1234567890123456789012345678901234567890123456789012345',
  'confirmed'
),
(
  'f1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  'TX-FABRIC-D6F7E8D9A0B1C234567890123ABCDEF1234567890ABCDEF1234567890ABCDEF1234',
  1120,
  'd6f7e8d9a0b1c2345678901234567890123456789012345678901234567890123456',
  'confirmed'
),
(
  -- TAMPERED doc: anchor has ORIGINAL hash (99aa...) — different from current file hash (f8f9...)
  -- This mismatch is what the tamper-detection demo catches
  'f1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000006',
  'TX-FABRIC-99AABBC0D1E2F3456789012345ABCDEF1234567890ABCDEF1234567890ABCDEF12',
  1098,
  '99aabb0cd1e2f3456789012345678901234567890123456789012345678901234567',  -- ORIGINAL hash before tampering
  'confirmed'
),
(
  'f1000000-0000-0000-0000-000000000005',
  'e1000000-0000-0000-0000-000000000008',
  'TX-FABRIC-B2C3D4E5F6A7B8C9D0E1F2A3B4ABCDEF1234567890ABCDEF1234567890ABCDEF12',
  998,
  'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
  'confirmed'
);

-- ============================================================
-- DIGITAL SIGNATURES
-- ============================================================
INSERT INTO digital_signatures (id, document_version_id, signed_by, certificate_id, certificate_subject, signature_value, signing_algorithm) VALUES
(
  'g1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'DSC-IN-2026-042-PRIYA-SHARMA',
  'CN=PRIYA SHARMA, OU=SUB INSPECTOR, O=DELHI POLICE, C=IN',
  'BASE64SIGVALUE_PRIYA_FIR_WSD_00123==',
  'SHA256withRSA'
),
(
  'g1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  'DSC-IN-2026-FSL-MEENA-IYER',
  'CN=DR MEENA IYER, OU=FORENSIC ANALYST, O=FORENSIC SCIENCE LAB, C=IN',
  'BASE64SIGVALUE_MEENA_FORENSIC_REPORT==',
  'SHA256withRSA'
),
(
  'g1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000003',
  'DSC-IN-2026-087-ARJUN-NAIR',
  'CN=ARJUN NAIR, OU=INSPECTOR, O=MUMBAI POLICE, C=IN',
  'BASE64SIGVALUE_ARJUN_FIR_CCB_00456==',
  'SHA256withRSA'
),
(
  'g1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000008',
  'b1000000-0000-0000-0000-000000000002',
  'DSC-IN-2026-042-PRIYA-SHARMA',
  'CN=PRIYA SHARMA, OU=SUB INSPECTOR, O=DELHI POLICE, C=IN',
  'BASE64SIGVALUE_PRIYA_CHARGESHEET_09901==',
  'SHA256withRSA'
);

-- ============================================================
-- CHAIN OF CUSTODY
-- ============================================================
INSERT INTO chain_of_custody (document_id, handler_id, action, ip_address, notes) VALUES
('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'created',   '10.10.1.42', 'FIR filed and uploaded to SentinelDMS'),
('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'signed',    '10.10.1.42', 'IO Priya Sharma applied DSC'),
('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'viewed',    '10.10.2.10', 'DCP Suresh Babu reviewed FIR'),
('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 'created',   '10.10.5.21', 'Forensic report uploaded by Dr. Meena Iyer'),
('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 'signed',    '10.10.5.21', 'FSL analyst applied DSC'),
('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'viewed',    '10.10.1.42', 'IO Priya Sharma reviewed forensic findings'),
('d1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 'created',   '10.10.1.87', 'Witness statement uploaded'),
('d1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 'viewed',    '10.10.1.87', 'IO reviewed witness statement'),
('d1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'viewed',    '10.10.0.01', '*** Unauthorized access detected — DEMO TAMPER SCENARIO ***'),
('d1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'created',   '10.10.1.42', 'Chargesheet uploaded'),
('d1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000005', 'viewed',    '10.10.3.11', 'Judge viewed chargesheet'),
('d1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'archived',  '10.10.1.42', 'Case closed — documents archived');

-- ============================================================
-- TAMPER CHECK — Demo scenario
-- ============================================================
INSERT INTO tamper_checks (document_version_id, blockchain_anchor_id, checked_by, current_hash, anchored_hash, is_tampered, check_notes) VALUES
(
  'e1000000-0000-0000-0000-000000000006',
  'f1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000001',
  'f8f9e0d1a2b3c4567890123456789012345678901234567890123456789012345678',   -- CURRENT (tampered)
  '99aabb0cd1e2f3456789012345678901234567890123456789012345678901234567',   -- BLOCKCHAIN (original)
  TRUE,
  'ALERT: File hash does not match blockchain anchor. Document may have been tampered with after anchoring.'
);

-- ============================================================
-- OCR RESULTS
-- ============================================================
INSERT INTO ocr_results (document_version_id, extracted_text, language_detected, confidence_score, processing_engine) VALUES
(
  'e1000000-0000-0000-0000-000000000001',
  'प्राथमिकी | FIR No: CR-2026-WSD-00123 | Police Station: PS-Delhi-21 | Date: 10/02/2026 | Complainant: Sunita Rao | Nature of Offence: Online Harassment (IT Act Section 67) | Description: The complainant reported that accused Rahul Verma has been sending threatening and obscene messages via WhatsApp...',
  'hi',
  0.9234,
  'tesseract'
),
(
  'e1000000-0000-0000-0000-000000000003',
  'FORENSIC ANALYSIS REPORT | Case: CR-2026-WSD-00123 | Exhibit: Mobile Phone (Samsung Galaxy S21) | Examiner: Dr. Meena Iyer | Date: 14/02/2026 | Findings: 847 WhatsApp messages recovered including deleted messages. Metadata confirms messages originated from phone number +91-XXXXXXXXXX...',
  'en',
  0.9812,
  'tesseract'
),
(
  'e1000000-0000-0000-0000-000000000004',
  'FIRST INFORMATION REPORT | FIR No: CR-2026-CCB-00456 | Case: Financial Fraud | Accused: Raman Enterprises Pvt Ltd | Amount Defrauded: Rs. 4,20,00,000 | Banks Involved: State Bank of India, HDFC Bank | Modus Operandi: Forged documents submitted for loan disbursement...',
  'en',
  0.9671,
  'tesseract'
),
(
  'e1000000-0000-0000-0000-000000000007',
  'CYBER CRIME INCIDENT REPORT | Case: CR-2026-CC-00789 | Attack Type: Ransomware | Target: State Government Hospital Network | Date of Attack: 04/04/2026 | Systems Affected: 234 workstations, 12 servers | Ransom Demanded: 50 BTC | Status: Under Investigation...',
  'en',
  0.9543,
  'tesseract'
);

-- ============================================================
-- AI CLASSIFICATIONS
-- ============================================================
INSERT INTO ai_classifications (document_id, document_version_id, predicted_type, confidence_score, extracted_entities, tags_suggested, model_name, model_version, is_accepted) VALUES
(
  'd1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'fir',
  0.9876,
  '{"names":["Sunita Rao","Rahul Verma"],"dates":["2026-02-10"],"case_numbers":["CR-2026-WSD-00123"],"sections":["IT Act Section 67","IPC 354D"]}'::jsonb,
  ARRAY['fir','women-safety','online-harassment','cyber'],
  'IndicBERT-legal-v2',
  '2.1.0',
  TRUE
),
(
  'd1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000003',
  'forensic_report',
  0.9912,
  '{"names":["Dr. Meena Iyer","Sunita Rao"],"dates":["2026-02-14"],"case_numbers":["CR-2026-WSD-00123"],"exhibits":["Samsung Galaxy S21"]}'::jsonb,
  ARRAY['forensics','digital-evidence','mobile','whatsapp'],
  'IndicBERT-legal-v2',
  '2.1.0',
  TRUE
),
(
  'd1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000004',
  'fir',
  0.9734,
  '{"names":["Raman Enterprises Pvt Ltd"],"dates":["2026-03-01"],"case_numbers":["CR-2026-CCB-00456"],"amounts":["4,20,00,000"],"banks":["State Bank of India","HDFC Bank"]}'::jsonb,
  ARRAY['fir','fraud','financial','bank'],
  'IndicBERT-legal-v2',
  '2.1.0',
  TRUE
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, success) VALUES
('b1000000-0000-0000-0000-000000000002', 'user.login',         'user',     'b1000000-0000-0000-0000-000000000002', '10.10.1.42', TRUE),
('b1000000-0000-0000-0000-000000000002', 'case.create',        'case',     'c1000000-0000-0000-0000-000000000001', '10.10.1.42', TRUE),
('b1000000-0000-0000-0000-000000000002', 'document.upload',    'document', 'd1000000-0000-0000-0000-000000000001', '10.10.1.42', TRUE),
('b1000000-0000-0000-0000-000000000002', 'document.sign',      'document', 'd1000000-0000-0000-0000-000000000001', '10.10.1.42', TRUE),
('b1000000-0000-0000-0000-000000000004', 'user.login',         'user',     'b1000000-0000-0000-0000-000000000004', '10.10.5.21', TRUE),
('b1000000-0000-0000-0000-000000000004', 'document.upload',    'document', 'd1000000-0000-0000-0000-000000000003', '10.10.5.21', TRUE),
('b1000000-0000-0000-0000-000000000004', 'document.sign',      'document', 'd1000000-0000-0000-0000-000000000003', '10.10.5.21', TRUE),
('b1000000-0000-0000-0000-000000000006', 'user.login',         'user',     'b1000000-0000-0000-0000-000000000006', '10.10.2.10', TRUE),
('b1000000-0000-0000-0000-000000000006', 'document.view',      'document', 'd1000000-0000-0000-0000-000000000001', '10.10.2.10', TRUE),
('b1000000-0000-0000-0000-000000000001', 'tamper.detected',    'document', 'd1000000-0000-0000-0000-000000000006', '10.10.0.01', TRUE),
('b1000000-0000-0000-0000-000000000003', 'case.create',        'case',     'c1000000-0000-0000-0000-000000000002', '10.10.1.87', TRUE),
('b1000000-0000-0000-0000-000000000009', 'case.create',        'case',     'c1000000-0000-0000-0000-000000000003', '10.10.9.01', TRUE);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (user_id, type, title, message, related_resource_type, related_resource_id, is_read) VALUES
(
  'b1000000-0000-0000-0000-000000000002',
  'document_uploaded',
  'New document in Case CR-2026-WSD-00123',
  'Forensic report has been uploaded by Dr. Meena Iyer.',
  'document',
  'd1000000-0000-0000-0000-000000000003',
  FALSE
),
(
  'b1000000-0000-0000-0000-000000000006',
  'signature_requested',
  'Document Awaiting Your Review',
  'Witness Statement for Case CR-2026-CCB-00456 requires your review before signing.',
  'document',
  'd1000000-0000-0000-0000-000000000006',
  FALSE
),
(
  'b1000000-0000-0000-0000-000000000001',
  'tamper_detected',
  'ALERT: Tamper Detected on Document',
  'File hash mismatch detected on Witness Statement (CR-2026-CCB-00456). Immediate review required.',
  'document',
  'd1000000-0000-0000-0000-000000000006',
  FALSE
),
(
  'b1000000-0000-0000-0000-000000000003',
  'case_updated',
  'Case CR-2026-CCB-00456 Status Update',
  'Case assigned to you is now under active investigation.',
  'case',
  'c1000000-0000-0000-0000-000000000002',
  TRUE
);

-- ============================================================
-- WORKFLOWS
-- ============================================================
INSERT INTO workflows (case_id, document_id, initiated_by, assigned_to, status, workflow_type, priority, notes) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000006',
  'pending',
  'document_approval',
  1,
  'FIR requires DCP approval before forwarding to court.'
),
(
  'c1000000-0000-0000-0000-000000000002',
  NULL,
  'b1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000006',
  'in_review',
  'case_status_change',
  2,
  'Requesting case status update to under_investigation.'
);

SELECT 'SentinelDMS seed data loaded successfully.' AS status;
SELECT COUNT(*) AS roles_count    FROM roles;
SELECT COUNT(*) AS users_count    FROM users;
SELECT COUNT(*) AS cases_count    FROM cases;
SELECT COUNT(*) AS documents_count FROM documents;
SELECT COUNT(*) AS versions_count  FROM document_versions;
SELECT COUNT(*) AS anchors_count   FROM blockchain_anchors;
