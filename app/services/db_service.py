"""
Faz 4 — DB Service
MySQL (SQLAlchemy) + ChromaDB işlemleri. Repository pattern.
"""
import json
import logging
from typing import Optional

import chromadb
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.database import ChatMessage, Document, Extraction, Invoice

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ChromaDB client (lazy singleton)
# ---------------------------------------------------------------------------

_chroma_client: Optional[chromadb.PersistentClient] = None
_chroma_collection = None


def _get_chroma_collection():
    global _chroma_client, _chroma_collection
    if _chroma_collection is None:
        _chroma_client = chromadb.PersistentClient(path="./chroma_data")
        _chroma_collection = _chroma_client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
    return _chroma_collection


# ---------------------------------------------------------------------------
# Embedding (nomic-embed-text via Ollama)
# ---------------------------------------------------------------------------

async def _get_embedding(text: str) -> list[float]:
    payload = {"model": settings.EMBED_MODEL, "input": text}
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/embed",
            json=payload,
        )
        response.raise_for_status()
    return response.json()["embeddings"][0]


# ---------------------------------------------------------------------------
# Document repository
# ---------------------------------------------------------------------------

def save_document(db: Session, filename: str, doc_type: str, file_path: str) -> Document:
    doc = Document(filename=filename, doc_type=doc_type, file_path=file_path)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    logger.info(f"Belge kaydedildi: id={doc.id}, tip={doc_type}")
    return doc


def save_extraction(db: Session, document_id: int, raw_json: dict) -> Extraction:
    ext = Extraction(
        document_id=document_id,
        raw_json=raw_json,
        model_version=settings.VLM_MODEL,
    )
    db.add(ext)

    # Fatura ise Invoice tablosuna da kaydet
    if raw_json.get("firma_adi") is not None:
        invoice = Invoice(
            document_id=document_id,
            firma_adi=raw_json.get("firma_adi"),
            tarih=raw_json.get("tarih"),
            fatura_no=raw_json.get("fatura_no"),
            toplam_tutar=raw_json.get("toplam_tutar"),
            kdv_tutari=raw_json.get("kdv_tutari"),
        )
        db.add(invoice)

    db.commit()
    db.refresh(ext)
    return ext


async def save_embedding(document_id: int, raw_json: dict):
    """Belge verisini vektöre çevirip ChromaDB'ye kaydeder. ChromaDB yoksa atlar."""
    try:
        text = json.dumps(raw_json, ensure_ascii=False)
        embedding = await _get_embedding(text)
        collection = _get_chroma_collection()
        collection.upsert(
            ids=[str(document_id)],
            embeddings=[embedding],
            metadatas=[{"document_id": document_id}],
            documents=[text],
        )
        logger.info(f"Embedding ChromaDB'ye kaydedildi: doc_id={document_id}")
    except Exception as e:
        logger.warning(f"ChromaDB embedding atlandı (doc_id={document_id}): {e}")


def delete_embedding(document_id: int):
    """ChromaDB'den embedding'i siler. Yoksa atlar."""
    try:
        collection = _get_chroma_collection()
        collection.delete(ids=[str(document_id)])
        logger.info(f"Embedding ChromaDB'den silindi: doc_id={document_id}")
    except Exception as e:
        logger.warning(f"ChromaDB embedding silme atlandı (doc_id={document_id}): {e}")


async def search_similar_documents(query: str, n_results: int = 5) -> list[int]:
    """Sorguya en benzer belgelerin document_id listesini döner."""
    embedding = await _get_embedding(query)
    collection = _get_chroma_collection()
    results = collection.query(query_embeddings=[embedding], n_results=n_results)
    ids = results["ids"][0] if results["ids"] else []
    return [int(i) for i in ids]


# ---------------------------------------------------------------------------
# Chat history repository
# ---------------------------------------------------------------------------

def save_chat_message(db: Session, document_id: int, role: str, content: str) -> ChatMessage:
    msg = ChatMessage(document_id=document_id, role=role, content=content)
    db.add(msg)
    db.commit()
    return msg


def get_chat_history(db: Session, document_id: int) -> list[dict]:
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.document_id == document_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return [{"role": m.role, "content": m.content, "created_at": str(m.created_at)} for m in messages]


# ---------------------------------------------------------------------------
# Document queries
# ---------------------------------------------------------------------------

def get_document(db: Session, document_id: int) -> Optional[Document]:
    return db.query(Document).filter(Document.id == document_id).first()


def get_all_documents(db: Session) -> list[Document]:
    return db.query(Document).order_by(Document.created_at.desc()).all()
