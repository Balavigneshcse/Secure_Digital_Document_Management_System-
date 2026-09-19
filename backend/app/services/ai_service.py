import httpx
import json
from typing import List, Optional

AI_SERVICE_URL = "http://localhost:8001/ai"

class AIService:
    @staticmethod
    async def process_document(
        file_bytes: bytes,
        filename: str,
        document_id: str = "",
        case_id: str = "public",
        case_title: Optional[str] = None,
        auto_index: bool = True
    ) -> dict:
        """
        Calls the AI microservice to run OCR + Classification + Embed + Index
        """
        async with httpx.AsyncClient() as client:
            files = {"file": (filename, file_bytes)}
            data = {
                "case_id": case_id,
                "doc_title": case_title or ""
            }
            response = await client.post(
                f"{AI_SERVICE_URL}/process", 
                files=files, 
                data=data,
                timeout=120.0
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def semantic_search(
        query: str, 
        allowed_case_ids: List[str], 
        top_k: int = 5, 
        document_type_filter: Optional[str] = None
    ) -> List[dict]:
        """
        Calls the AI microservice for semantic search.
        """
        async with httpx.AsyncClient() as client:
            payload = {
                "query": query,
                "allowed_case_ids": allowed_case_ids,
                "top_k": top_k,
                "document_type_filter": document_type_filter
            }
            response = await client.post(
                f"{AI_SERVICE_URL}/search", 
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()

    @staticmethod
    async def summarize_case(documents: List[dict]) -> dict:
        """
        Calls the AI microservice to summarize multiple documents for a case.
        """
        async with httpx.AsyncClient() as client:
            payload = {"documents": documents}
            response = await client.post(
                f"{AI_SERVICE_URL}/summarize-case", 
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            return response.json()

