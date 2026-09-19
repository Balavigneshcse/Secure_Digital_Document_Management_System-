import uuid
from typing import List, Optional
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document, ClassificationEnum
from app.services.minio_service import minio_service
from app.core.hashing import compute_sha256_stream

class DocumentService:
    @staticmethod
    async def upload_document(
        db: AsyncSession,
        file: UploadFile,
        title: str,
        uploaded_by: uuid.UUID,
        description: Optional[str] = None,
        case_id: Optional[uuid.UUID] = None,
        classification: ClassificationEnum = ClassificationEnum.OTHER
    ) -> Document:
        # Compute SHA-256
        sha256_hash = await compute_sha256_stream(file)
        
        # Generate unique file name
        ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        file_id = str(uuid.uuid4())
        object_name = f"{file_id}.{ext}" if ext else file_id
        
        # Reset file pointer and upload to MinIO
        await file.seek(0)
        file_content = await file.read()
        minio_service.upload_file(
            object_name=object_name,
            file_data=file.file,
            length=len(file_content),
            content_type=file.content_type
        )
        
        # Save to database
        db_doc = Document(
            id=uuid.UUID(file_id),
            title=title,
            description=description,
            file_path=object_name,
            file_type=file.content_type,
            sha256_hash=sha256_hash,
            uploaded_by=uploaded_by,
            case_id=case_id,
            classification=classification
        )
        db.add(db_doc)
        await db.commit()
        await db.refresh(db_doc)
        
        # Trigger AI Processing (OCR, Classify, Index)
        try:
            from app.services.ai_service import AIService
            ai_result = await AIService.process_document(
                file_bytes=file_content,
                filename=file.filename,
                document_id=str(db_doc.id),
                case_id=str(case_id) if case_id else "public",
                case_title=None,
                auto_index=True
            )
            print(f"AI Processing complete for {file_id}: {ai_result['classifier']['documentType']}")
            
            # Update database with AI results
            db_doc.ocr_text = ai_result.get('ocr', {}).get('text')
            try:
                db_doc.classification = ClassificationEnum(ai_result.get('classifier', {}).get('documentType', 'OTHER'))
            except ValueError:
                db_doc.classification = ClassificationEnum.OTHER
            
            db.add(db_doc)
            await db.commit()
            await db.refresh(db_doc)

        except Exception as e:
            print(f"AI Processing failed for {file_id}: {e}")
            
        return db_doc

    @staticmethod
    async def get_document(db: AsyncSession, document_id: uuid.UUID) -> Optional[Document]:
        stmt = select(Document).where(Document.id == document_id, Document.is_deleted == False)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
