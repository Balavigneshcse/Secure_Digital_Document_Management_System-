from fastapi import APIRouter
from app.api.v1 import auth, documents, cases, audit, users, blockchain, ai

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
