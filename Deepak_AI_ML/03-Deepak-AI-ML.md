# Working Doc — Deepak (AI/ML Engineer)

## Your Mission
Turn raw uploaded documents into structured, searchable, classified data — and power the natural-language assistant on top of it. Everything you build ships as internal microservices Balavignesh's backend calls.

## Tech Stack
- **Service framework:** Python + FastAPI (fast to stand up, easy JSON contracts for Balavignesh to consume)
- **OCR:** Tesseract OCR via `pytesseract` (offline — no document ever leaves your infra)
- **NLP / Classification:** spaCy for base NLP, HuggingFace Transformers for classification; consider **IndicBERT** if you want to handle Tamil/Hindi documents (worth doing — most competing teams will be English-only)
- **Semantic Search:** `sentence-transformers` (e.g. `all-MiniLM-L6-v2`) + FAISS for vector index
- **RAG Chatbot:** LangChain + a **self-hosted** LLM via Ollama (e.g. Llama 3 8B) — do not call an external LLM API with real case content, even in the demo, since it undermines your own "data never leaves our infra" pitch
- **Serving:** Uvicorn, Dockerized

### Setup (Day 1)
```bash
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn pytesseract pillow spacy sentence-transformers faiss-cpu langchain
python -m spacy download en_core_web_sm
# system dependency: install tesseract-ocr binary (apt/brew)
# separately: install Ollama and pull a model — ollama pull llama3
```

## Services to Build

### 1. OCR Service
```
POST /ocr/extract
  in:  { file: <binary or base64> }
  out: { text: string, confidence: float, pages: [...] }
```

### 2. Classification Service
```
POST /classify
  in:  { text: string }
  out: { documentType: "FIR" | "chargesheet" | "witness_statement" | "forensic_report" | "court_filing" | "other",
         confidence: float,
         entities: { names: [], dates: [], caseNumbers: [], locations: [] } }
```
Start with a rule-based/keyword classifier for Week 1 speed, upgrade to a fine-tuned transformer once you have a labeled sample set (build ~50–100 synthetic sample docs per type early — don't wait for real data that won't exist).

### 3. Semantic Search Service
```
POST /search/index          → embeds + stores a document's text in FAISS (called after every upload)
POST /search/query
  in:  { query: string, userId: string, allowedCaseIds: [...] }   // respect access scope!
  out: { results: [{ documentId, score, snippet }] }
```

### 4. RAG Chatbot Service
```
POST /assistant/ask
  in:  { question: string, userId: string, allowedCaseIds: [...] }
  out: { answer: string, sources: [{ documentId, snippet }] }
```
**Important:** the chatbot must only retrieve/answer from documents the requesting user is authorized to see — pass the allowed scope in from Balavignesh's auth layer on every call, don't trust the frontend for this.

## Suggested Folder Structure
```
ai-services/
  ocr/
  classifier/
  search/
  chatbot/
  shared/ (model loading, config)
  data/ (synthetic sample documents for testing)
```

## Dependencies

**You need from teammates:**
- Arunkumar: confirm whether you write directly to Elasticsearch or hand back embeddings for him to store — decide this Week 1, don't build both paths
- Balavignesh: the shape of the "allowed case scope" claim from the auth token, so your search/chatbot can enforce it

**Teammates need from you:**
- Balavignesh: finalized API contracts for all 4 services by end of Week 1 — he's building against these
- Dineshkarthick: response shape for search results and chatbot answers (with source citations) — he needs this to design the UI

## Milestones
- **Week 1:** API contracts finalized and shared, OCR service working end-to-end, ~50 synthetic sample documents created
- **Week 2–3:** Classification service (rule-based first pass), FAISS indexing pipeline
- **Week 3–4:** Semantic search live, RAG chatbot MVP with source citations
- **Week 4–5:** Access-scope enforcement, accuracy tuning, IndicBERT if time allows
- **Week 5–6:** Bug fixes, demo dataset prep (make sure your demo documents produce clean, impressive classification/search results)

## First 3 Days Checklist
- [ ] Set up FastAPI project + Docker
- [ ] Get OCR working on a few sample scanned images
- [ ] Draft and share the 4 API contracts above with Balavignesh and Dineshkarthick for feedback
- [ ] Create ~20 synthetic sample documents (FIR, chargesheet, witness statement) to start testing classification against
