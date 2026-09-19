from fastapi import APIRouter, Depends, HTTPException
import uuid
from pydantic import BaseModel
from typing import Any

from app.core.dependencies import get_current_user
from app.models.user import User, RoleEnum
from app.core.rbac import RoleChecker
from app.services.blockchain_service import BlockchainService

router = APIRouter()

class BlockchainVerifyResponse(BaseModel):
    doc_id: uuid.UUID
    original_hash: str
    status: str

@router.get("/verify/{doc_id}", response_model=BlockchainVerifyResponse)
async def verify_document_on_chain(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.DEFENCE))
):
    try:
        original_hash = await BlockchainService.verify_hash(doc_id)
        return BlockchainVerifyResponse(
            doc_id=doc_id,
            original_hash=original_hash,
            status="VERIFIED"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/test", response_model=Any)
async def test_blockchain(
    iterations: int = 10,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(RoleChecker(RoleEnum.ADMIN))
):
    try:
        result = BlockchainService.run_automated_test(iterations=iterations)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
