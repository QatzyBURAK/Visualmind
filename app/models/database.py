"""
Faz 4 — SQLAlchemy modelleri
MySQL tablo tanımları.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from app.core.config import settings

engine = create_engine(settings.MYSQL_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)  # invoice / receipt / technical / generic
    file_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    extractions = relationship("Extraction", back_populates="document", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="document", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="document", cascade="all, delete-orphan")


class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    raw_json = Column(JSON)
    model_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="extractions")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    firma_adi = Column(String(255))
    tarih = Column(String(50))
    fatura_no = Column(String(100))
    toplam_tutar = Column(Float)
    kdv_tutari = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="invoices")


class ChatMessage(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chat_messages")


def get_db():
    """FastAPI dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
