# Implementation Plan: AI Integration & Final Completion

This plan covers integrating your friend's complete AI Pipeline (`SentinelDMS_AI`) directly into the FastAPI backend, processing uploaded documents, and exposing the AI features to the frontend.

## Proposed Changes

### 1. Backend Environment
- **Install Dependencies**: Execute `pip install -r ../SentinelDMS_AI/requirements.txt` in the `backend/venv`.
- **Integrate File**: Copy `SentinelDMS_AI/ai_pipeline_standalone.py` to `backend/app/services/ai_pipeline.py`.

### 2. Update `ai_service.py`
Modify `backend/app/services/ai_service.py` to use the unified pipeline.
- Create a module-level instance of `AIPipeline`.
- Create async wrappers for `process_document`, `search`, and `summarize_case` utilizing `asyncio.to_thread()` so the heavy AI processing doesn't block the FastAPI server.

### 3. Connect to Document Upload
#### [MODIFY] `backend/app/services/document_service.py`
- Modify the `upload_document` method to read the file bytes and pass them to `AIService.process_document()`.
- Save the extracted text, classification, and metadata to the database along with the file.

### 4. New AI API Endpoints
#### [NEW] `backend/app/api/v1/ai.py`
- Expose `/search` endpoint to query the FAISS index.
- Expose `/summarize` endpoint to summarize cases or documents.

## Verification Plan
1. Upload a PDF/Image document through the API or Frontend.
2. Verify the document is successfully processed by the AI pipeline (OCR + Classification + FAISS Indexing).
3. Test the semantic search API.
