"""
Faz 5 — API Routes
FastAPI endpoint tanımları.
"""
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.database import get_db
from app.schemas import (
    DocumentInfo,
    QuestionRequest,
    QuestionResponse,
    RenameRequest,
    UploadResponse,
)
from app.services import db_service, llm_service, vlm_service

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


# ---------------------------------------------------------------------------
# POST /documents/upload
# ---------------------------------------------------------------------------

@router.post("/documents/upload", response_model=UploadResponse, tags=["documents"])
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = Form(default="generic"),
    db: Session = Depends(get_db),
):
    """
    Görsel veya PDF yükle. Arka planda VLM analizi başlatılır.
    doc_type: invoice | receipt | technical | generic
    """
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Desteklenmeyen format: {suffix}")

    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Dosya çok büyük.")

    # Kaydet
    unique_name = f"{uuid.uuid4().hex}{suffix}"
    save_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(save_path, "wb") as f:
        f.write(await file.read())

    # DB'ye kaydet
    doc = db_service.save_document(db, file.filename, doc_type, save_path)

    # Arka planda VLM çalıştır
    background_tasks.add_task(_process_document, doc.id, save_path, doc_type)

    return UploadResponse(
        document_id=doc.id,
        status="processing",
        message="Belge alındı, analiz arka planda başlatıldı.",
    )


async def _process_document(document_id: int, file_path: str, doc_type: str):
    """Background task: VLM analizi + DB + ChromaDB."""
    from app.models.database import SessionLocal

    db = SessionLocal()
    try:
        extracted = await vlm_service.analyze_image(file_path, doc_type)
        db_service.save_extraction(db, document_id, extracted)
        await db_service.save_embedding(document_id, extracted)
        logger.info(f"Belge işlendi: doc_id={document_id}")
    except Exception as e:
        logger.error(f"Belge işleme hatası (doc_id={document_id}): {e}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /documents/{document_id}
# ---------------------------------------------------------------------------

@router.get("/documents/{document_id}", response_model=DocumentInfo, tags=["documents"])
def get_document(document_id: int, db: Session = Depends(get_db)):
    """Belge bilgilerini ve çıkarılan veriyi döner."""
    doc = db_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")

    extraction = doc.extractions[-1] if doc.extractions else None

    return DocumentInfo(
        id=doc.id,
        filename=doc.filename,
        doc_type=doc.doc_type,
        created_at=str(doc.created_at),
        extracted_data=extraction.raw_json if extraction else {},
    )


# ---------------------------------------------------------------------------
# GET /documents
# ---------------------------------------------------------------------------

@router.get("/documents", tags=["documents"])
def list_documents(db: Session = Depends(get_db)):
    """Tüm belgeleri listeler."""
    docs = db_service.get_all_documents(db)
    return [
        {"id": d.id, "filename": d.filename, "doc_type": d.doc_type, "created_at": str(d.created_at)}
        for d in docs
    ]


# ---------------------------------------------------------------------------
# POST /documents/{document_id}/ask
# ---------------------------------------------------------------------------

@router.post("/documents/{document_id}/ask", response_model=QuestionResponse, tags=["chat"])
async def ask_question(document_id: int, body: QuestionRequest, db: Session = Depends(get_db)):
    """Belge hakkında soru sor."""
    doc = db_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")

    extraction = doc.extractions[-1] if doc.extractions else None
    if not extraction:
        raise HTTPException(status_code=422, detail="Belge henüz analiz edilmedi, bekleyin.")

    # Konuşma oturumu al (geçmiş DB'den yüklenir)
    history = db_service.get_chat_history(db, document_id)
    session = llm_service.get_or_create_session(document_id, extraction.raw_json)
    # DB'den senkronize et (sadece role/content alanları, created_at olmadan)
    session.history = [{"role": m["role"], "content": m["content"]} for m in history]

    answer = await session.ask(body.question)

    # Geçmişi DB'ye kaydet
    db_service.save_chat_message(db, document_id, "user", body.question)
    db_service.save_chat_message(db, document_id, "assistant", answer)

    return QuestionResponse(
        document_id=document_id,
        question=body.question,
        answer=answer,
        chat_history_length=len(session.history),
    )


# ---------------------------------------------------------------------------
# DELETE /documents/{document_id}/history
# ---------------------------------------------------------------------------

@router.delete("/documents/{document_id}/history", tags=["chat"])
def clear_history(document_id: int):
    """Konuşma geçmişini bellekten temizler."""
    llm_service.clear_session(document_id)
    return {"message": "Konuşma geçmişi temizlendi."}


# ---------------------------------------------------------------------------
# DELETE /documents/{document_id}
# ---------------------------------------------------------------------------

@router.delete("/documents/{document_id}", tags=["documents"])
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Belgeyi, ilişkili kayıtları ve dosyayı siler."""
    doc = db_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")

    # uploads/ klasöründeki dosyayı sil
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError as e:
            logger.warning(f"Dosya silinemedi ({doc.file_path}): {e}")

    # ChromaDB'den embedding'i sil
    db_service.delete_embedding(document_id)

    # Bellekteki konuşma oturumunu temizle
    llm_service.clear_session(document_id)

    # DB'den belgeyi sil (cascade ile extraction, chat_history, invoice da silinir)
    db.delete(doc)
    db.commit()

    return {"message": "Belge silindi."}


# ---------------------------------------------------------------------------
# PATCH /documents/{document_id}
# ---------------------------------------------------------------------------

@router.patch("/documents/{document_id}", tags=["documents"])
def rename_document(document_id: int, body: RenameRequest, db: Session = Depends(get_db)):
    """Belge adını günceller."""
    doc = db_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")
    new_name = body.filename.strip()
    if not new_name:
        raise HTTPException(status_code=422, detail="Dosya adı boş olamaz.")
    doc.filename = new_name
    db.commit()
    return {"id": doc.id, "filename": doc.filename}


# ---------------------------------------------------------------------------
# GET /documents/{document_id}/status
# ---------------------------------------------------------------------------

@router.get("/documents/{document_id}/status", tags=["documents"])
def get_document_status(document_id: int, db: Session = Depends(get_db)):
    """Frontend polling için belge işlem durumunu döner."""
    doc = db_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")

    extraction = doc.extractions[-1] if doc.extractions else None
    if extraction and extraction.raw_json:
        return {"status": "ready", "document_id": document_id}
    return {"status": "processing", "document_id": document_id}


# ---------------------------------------------------------------------------
# GET /documents/{document_id}/history
# ---------------------------------------------------------------------------

@router.get("/documents/{document_id}/history", tags=["chat"])
def get_document_history(document_id: int, db: Session = Depends(get_db)):
    """Belgeye ait tüm chat mesajlarını döner."""
    doc = db_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")

    return db_service.get_chat_history(db, document_id)


# ---------------------------------------------------------------------------
# POST /search
# ---------------------------------------------------------------------------

@router.post("/search", tags=["rag"])
async def semantic_search(query: str, db: Session = Depends(get_db)):
    """Sorguya anlamsal olarak en yakın belgeleri döner (RAG)."""
    similar_ids = await db_service.search_similar_documents(query)
    results = []
    for doc_id in similar_ids:
        doc = db_service.get_document(db, doc_id)
        if doc:
            results.append({"id": doc.id, "filename": doc.filename, "doc_type": doc.doc_type})
    return {"query": query, "results": results}
