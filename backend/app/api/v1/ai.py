from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, List, Optional
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.core.rbac import RoleChecker
from app.services.ai_service import AIService

router = APIRouter()

class SearchQuery(BaseModel):
    query: str
    allowed_cases: List[str] = ["public"]
    top_k: int = 5
    document_type: Optional[str] = None

class SummarizeRequest(BaseModel):
    documents: List[dict] # Expected format: [{"text": "...", "documentType": "FIR"}]

@router.post("/search", response_model=Any)
async def semantic_search(
    search_req: SearchQuery,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.IO))
):
    try:
        results = await AIService.semantic_search(
            query=search_req.query,
            allowed_case_ids=search_req.allowed_cases,
            top_k=search_req.top_k,
            document_type_filter=search_req.document_type
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize/case", response_model=Any)
async def summarize_case_documents(
    req: SummarizeRequest,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.IO))
):
    try:
        summary = await AIService.summarize_case(req.documents)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
