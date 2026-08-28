# SentinelDMS — Secure Digital Document Management System
### For Legal & Investigation Documents | Problem Statement ID: 26190
### Ministry of Home Affairs — NCRB, Women Safety Division

---

## A Quick Note Before We Start

The "Expected Solution" line in the official PS text ("monitor and manage police assets throughout their lifecycle") doesn't quite match the description (which is entirely about *documents*, not physical assets). This is common in SIH problem statements — it's likely a copy-paste leftover from a related PS. To stay safe with evaluators either way, I've built in a **Chain-of-Custody / Evidence Lifecycle module** that covers the "lifecycle tracking" angle for evidence records, while keeping the core product focused on documents (which is clearly the real ask). Flag this with your mentor if you get a chance — worth 30 seconds of clarity before demo day.

I've made a few default assumptions to give you a complete, usable plan instead of stalling on questions:
- Team size = the 6 people you named; you (team lead) take on architecture/integration/PM ownership on top of whichever member role you personally code in.
- Prototype timeline = ~5–6 weeks (typical SIH internal-to-finals window). Compress/expand the phase plan if your actual deadline differs.
- Cloud = AWS/Azure free tier for the demo, with a note on India's GI Cloud (MeghRaj) as the real-world government deployment target.

Open questions for your mentor are listed at the very end — none of them block you from starting today.

---

## 1. Product Name & One-Line Pitch

**SentinelDMS** — a blockchain-anchored, AI-assisted document management system that gives investigating officers, courts, and forensic teams a single secure place to store, search, sign, and audit every case document — with tamper-evidence built in from the moment a file is uploaded.

---

## 2. Core Modules

| # | Module | What it does |
|---|--------|---------------|
| 1 | **Auth & Access Control** | Role-based + attribute-based access (RBAC/ABAC), MFA, session management |
| 2 | **Document Ingestion** | Upload PDFs/images/scans; OCR for paper documents; metadata capture |
| 3 | **AI Classification & Extraction** | Auto-tags document type (FIR, chargesheet, witness statement, etc.), extracts entities (names, dates, case numbers) |
| 4 | **Secure Storage** | Encrypted object storage, versioning |
| 5 | **Blockchain Audit Trail** | Every document version's hash is anchored on a permissioned ledger — any tampering is instantly detectable |
| 6 | **Digital Signature / e-Stamping** | PKI-based signing so documents hold legal/evidentiary validity |
| 7 | **AI-Powered Search** | Semantic + keyword search across OCR'd text, filters by case, date, officer, document type |
| 8 | **Case & Workflow Management** | Links documents to case IDs, tracks approval workflows between departments |
| 9 | **Chain-of-Custody / Evidence Lifecycle** | Tracks every document/evidence record from creation → access → transfer → archival |
| 10 | **Audit & Compliance Dashboard** | Full activity logs, who-accessed-what-when, exportable compliance reports |
| 11 | **Collaboration & Secure Sharing** | Controlled inter-department sharing with expiring links / scoped access |
| 12 | **AI Assistant (RAG chatbot)** | Natural-language Q&A over documents the logged-in user is authorized to see |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                          │
│  React + TypeScript Web App  |  Role-based Dashboards         │
└───────────────────────────┬───────────────────────────────────┘
                             │ HTTPS / REST-GraphQL
┌───────────────────────────▼───────────────────────────────────┐
│  API GATEWAY  (Nginx + rate limiting + auth check)             │
└───────────────────────────┬───────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│  APPLICATION SERVICES (NestJS microservices)                   │
│  • Auth Service (Keycloak)   • Document Service                │
│  • Case/Workflow Service     • Notification Service            │
└──────┬───────────────┬────────────────┬────────────────────────┘
       │               │                │
┌──────▼──────┐ ┌──────▼───────┐ ┌──────▼────────────┐
│  AI SERVICES │ │  BLOCKCHAIN   │ │  SECURITY LAYER    │
│  OCR, NLP,   │ │  LAYER        │ │  AES-256, TLS 1.3, │
│  Classifier, │ │  Hyperledger  │ │  PKI Digital Sign,  │
│  Semantic    │ │  Fabric —     │ │  RBAC/ABAC via      │
│  Search, RAG │ │  hash-anchor  │ │  Keycloak, MFA       │
│  Chatbot     │ │  every doc    │ │                     │
└──────┬───────┘ └──────┬────────┘ └──────┬──────────────┘
       │                │                  │
┌──────▼────────────────▼──────────────────▼───────────────────┐
│  DATA LAYER                                                     │
│  PostgreSQL (case/user/audit metadata) · Elasticsearch (search) │
│  Redis (cache/sessions) · MinIO/S3 (encrypted document blobs)   │
└───────────────────────────────────────────────────────────────┘
```

**Document upload flow (the core innovation loop):**
Upload → OCR text extraction → AI classification & entity tagging → file encrypted & stored in object storage → SHA-256 hash of file computed → hash anchored on Hyperledger Fabric ledger → metadata + hash indexed in PostgreSQL/Elasticsearch → audit log entry created → (optional) officer applies digital signature → done.

Any later attempt to alter the file changes its hash, which no longer matches the blockchain-anchored hash — tampering is provably detectable without needing to store the whole document on-chain (keeps the chain fast and cheap).

---

## 4. Tech Stack — What & Why

| Layer | Technology | Why this, specifically |
|---|---|---|
| **Frontend** | React 18 + TypeScript, Redux Toolkit, Tailwind CSS + MUI | Type safety matters in a legal-grade app (fewer runtime bugs handling case data); component reuse speeds up building 10+ role-based dashboards; huge ecosystem/hiring pool — same reasoning MNCs use it |
| **Backend** | Node.js + NestJS (TypeScript) | Same language as frontend = faster team velocity and easier code review across Balavignesh/Dineshkarthick; NestJS gives you Angular-style modular architecture, built-in Guards for RBAC, and Interceptors that make audit-logging almost free to implement |
| **Primary DB** | PostgreSQL | ACID compliance is non-negotiable for legal metadata (case records, audit logs) — you cannot risk a lost write on a chain-of-custody entry |
| **Search Engine** | Elasticsearch | Full-text + fuzzy search across OCR'd document text at speed Postgres alone can't match |
| **Cache/Sessions** | Redis | Session storage, rate limiting, fast repeated-query caching |
| **Object Storage** | MinIO (S3-compatible) | Self-hostable — important because government data often can't sit on a third-party public cloud; drop-in swap to AWS S3 later if allowed |
| **OCR** | Tesseract OCR (open-source) | Runs fully offline/on-prem — no scanned FIR ever leaves your infrastructure, which matters a lot for this data class. (Mention AWS Textract/Google Vision in your report as a higher-accuracy paid alternative if the evaluators ask about scaling) |
| **NLP / Classification** | spaCy + HuggingFace Transformers (consider IndicBERT for regional-language FIRs) | Auto-classifies document type and extracts entities (names, dates, case numbers); IndicBERT support matters since Indian police documents are often not purely English |
| **Semantic Search** | Sentence-Transformers + FAISS | Lets officers search "who witnessed the robbery on MG Road" instead of exact keyword matching |
| **AI Assistant** | LangChain + a self-hosted open LLM (e.g., Llama 3 via Ollama) | Self-hosting is the important choice here — you cannot pipe FIR/witness-statement content through a third-party API for a government security use case. Keep it local. |
| **Blockchain** | Hyperledger Fabric (permissioned) | Chosen over Ethereum/Polygon deliberately: no gas fees, high throughput, and — most importantly — a *permissioned* consortium model where only police/courts/forensic labs are validating nodes, matching how government data-sovereignty requirements actually work. This is also the pattern used in most Indian government blockchain pilots (land records etc.), so it reads as a credible choice to evaluators. |
| **Digital Signatures** | PKI / X.509 certs, aligned with India's eSign & DSC framework | Gives documents actual legal/evidentiary standing, not just a UI checkbox |
| **IAM / RBAC-ABAC** | Keycloak | Don't hand-roll auth for a system like this — Keycloak gives you SSO, MFA, and fine-grained access policies out of the box, and it's a recognized enterprise-grade tool, which reads well in evaluation |
| **Containerization** | Docker + Docker Compose (K3s for a "we thought about scale" story) | Standard for demoing production-readiness without needing a huge cloud bill |
| **CI/CD** | GitHub Actions | Free, simple to wire up in a hackathon timeframe |
| **Reverse Proxy / Gateway** | Nginx | Rate limiting, SSL termination, single entry point |
| **Deployment (prototype)** | AWS/Azure free tier or local | For the real-world pitch, name India's **GI Cloud (MeghRaj)** as the target deployment — evaluators for a government PS respond well to this |

---

## 5. Compliance & Legal Grounding (mention this explicitly in your pitch — it's a differentiator)

- **IT Act, 2000 (Section 65B)** — governs admissibility of electronic records as evidence; your digital signature + hash-chain design directly supports this.
- **Indian Evidence Act** — chain-of-custody logging strengthens evidentiary integrity claims.
- **DPDP Act, 2023** — governs handling of personal data (witness/victim details); field-level encryption + RBAC address this.
- **CERT-In guidelines** — reference for your security posture.
- **ISO/IEC 27001** — cite as the framework your security design follows (you don't need certification for a prototype, just alignment).

---

## 6. Team Structure & Responsibilities

| Member | Role | Key Responsibilities |
|---|---|---|
| **Balavignesh** | Team Lead & Backend Developer | System architecture, sprint planning, integration between modules, final presentation, stakeholder-facing documentation, DevOps/CI-CD oversight — **plus** NestJS services (Auth, Document, Case/Workflow, Notification), API design, integration with Keycloak, integration with AI + Blockchain services |
| **Dineshkarthick** | Frontend Developer | React/TypeScript app, role-based dashboards (officer/judge/forensic/admin views), document upload & search UI, audit-log viewer |
| **Deepak** | AI/ML Engineer | OCR pipeline (Tesseract), NLP classification & entity extraction, semantic search (Sentence-Transformers + FAISS), RAG chatbot (LangChain + local LLM) |
| **Arunkumar** | Database Engineer | PostgreSQL schema design (cases, users, roles, audit logs), Elasticsearch indexing pipeline, MinIO storage structure, backup/DR strategy, encryption-at-rest setup |
| **Dharani Dharan** | Blockchain & Security Engineer | Hyperledger Fabric network setup, hash-anchoring service, digital signature/PKI integration, RBAC/ABAC policy design in Keycloak, MFA, OWASP hardening |
| **Aarthi** | UI/UX Designer + QA / Documentation Lead | Wireframes & Figma prototypes for each user persona (IO, judicial officer, forensic expert, admin), usability testing, test-case design & bug tracking, pitch deck + demo script + final report |

**Why this split for Dharani Dharan and Aarthi:** the two hardest things to get right in this specific problem — *evidentiary trust* (blockchain/security) and *usability under real police workflows* (UX + QA) — didn't have an owner yet. Both are also things judges specifically probe on for this kind of PS, so having named owners for them strengthens your presentation.

---

## 7. Prototype Build Plan (5–6 Week Sprint)

| Phase | Weeks | Focus | Owners |
|---|---|---|---|
| **1. Foundation** | Week 1 | Finalize requirements & personas, wireframes, DB schema, repo/CI setup, tech stack scaffolding | All, led by Balavignesh + Aarthi (UX) + Arunkumar (schema) |
| **2. Core Platform** | Week 2–3 | Auth/RBAC via Keycloak, document upload + storage (encrypted), case management CRUD, basic frontend shell | Balavignesh, Dineshkarthick, Arunkumar |
| **3. Intelligence Layer** | Week 3–4 | OCR pipeline, AI classification, semantic search, Hyperledger Fabric hash-anchoring, digital signature flow | Deepak, Dharani Dharan |
| **4. Integration & Hardening** | Week 4–5 | Wire AI + blockchain into main app, audit dashboard, RAG chatbot, security testing (OWASP checklist), QA test passes | Everyone + Aarthi (QA) |
| **5. Demo Prep** | Week 5–6 | End-to-end walkthrough polish, deployment, pitch deck, demo video, final report | Balavignesh + Aarthi |

**Minimum viable demo (non-negotiable for judging day):**
1. Login with role-based access (show 2 different roles seeing different things)
2. Upload a scanned document → watch OCR + auto-classification happen live
3. Show the hash getting anchored on the blockchain, then **deliberately tamper with the stored file** and show the system catching it — this single demo moment is usually the strongest one in these hackathons
4. Semantic search returning a relevant document from a natural-language query
5. Audit trail screen showing who touched what, when

---

## 8. Differentiators to Emphasize in Your Pitch

- Blockchain used *correctly* — only hashes on-chain, not full documents, so it's fast and defensible when a judge asks "why blockchain and not just a database with logs?"
- AI classification + regional-language support (IndicBERT) — most competing teams will do English-only.
- Self-hosted AI/OCR — directly addresses the "sensitive government data can't leave our servers" concern evaluators will raise.
- Chain-of-custody module explicitly answers the ambiguous "asset lifecycle" line in the PS.
- Compliance mapping (IT Act, Evidence Act, DPDP Act) shown as a table in your deck — signals you understand the legal domain, not just the tech.

---

## 9. Open Questions Worth Confirming (don't block on these — just check when you can)

- Exact submission/demo deadline, so the 5–6 week plan can be compressed or stretched accurately.
- Whether the prototype needs to be live-deployed or a local/recorded demo is acceptable.
- Whether your institute mandates a specific stack (some SIH mentors push MERN specifically) — the plan above swaps cleanly to Express instead of NestJS if needed, everything else stays the same.
- Whether real Hyperledger Fabric setup is feasible in your timeframe, or whether a simulated/lightweight hash-ledger (still demoing the tamper-detection concept) is acceptable for the prototype stage — this is a very common and accepted shortcut in hackathons given Fabric's setup overhead.

---

*Ready to also turn this into a pitch-deck (.pptx) or a one-page architecture diagram for your submission — just say the word.*
