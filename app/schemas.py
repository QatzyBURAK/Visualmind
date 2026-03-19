"""
Faz 2 — Pydantic şemaları
Her belge tipi için ayrı schema. VLM çıktısı buraya parse edilir.
"""
import re
from typing import Any, Optional
from pydantic import BaseModel, field_validator


def _parse_float(v: Any) -> Optional[float]:
    """'1.234,56 TL' → 1234.56 gibi Türkçe/karışık formatları temizler."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v)
    s = re.sub(r'[^\d,.]', '', s)   # Harf ve boşlukları kaldır
    if ',' in s and '.' in s:
        # Binlik nokta, ondalık virgül: "1.234,56" → "1234.56"
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        s = s.replace(',', '.')
    try:
        return float(s) if s else None
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Fatura (Invoice)
# ---------------------------------------------------------------------------

class InvoiceItem(BaseModel):
    aciklama: Optional[str] = None
    miktar: Optional[float] = None
    birim_fiyat: Optional[float] = None
    toplam: Optional[float] = None

    @field_validator('miktar', 'birim_fiyat', 'toplam', mode='before')
    @classmethod
    def clean_float(cls, v):
        return _parse_float(v)


class InvoiceSchema(BaseModel):
    firma_adi: Optional[str] = None
    tarih: Optional[str] = None
    fatura_no: Optional[str] = None
    toplam_tutar: Optional[float] = None
    kdv_tutari: Optional[float] = None
    kdv_orani: Optional[float] = None
    kalemler: list[InvoiceItem] = []

    notlar: Optional[str] = None

    @field_validator('toplam_tutar', 'kdv_tutari', 'kdv_orani', mode='before')
    @classmethod
    def clean_float(cls, v):
        return _parse_float(v)

    @field_validator('notlar', mode='before')
    @classmethod
    def coerce_notlar(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return v
        # Dict veya list gelirse JSON string'e çevir
        import json as _json
        return _json.dumps(v, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Makbuz (Receipt)
# ---------------------------------------------------------------------------

class ReceiptItem(BaseModel):
    urun_adi: Optional[str] = None
    miktar: Optional[float] = None
    birim: Optional[str] = None          # KG, ADET, LT vb.
    birim_fiyat: Optional[float] = None
    kdv_orani: Optional[float] = None    # %1, %8, %18
    toplam: Optional[float] = None

    @field_validator('miktar', 'birim_fiyat', 'kdv_orani', 'toplam', mode='before')
    @classmethod
    def clean_float(cls, v):
        return _parse_float(v)


class ReceiptSchema(BaseModel):
    magaza_adi: Optional[str] = None
    tarih: Optional[str] = None
    saat: Optional[str] = None
    fis_no: Optional[str] = None
    kalemler: list[ReceiptItem] = []
    ara_toplam: Optional[float] = None
    toplam_kdv: Optional[float] = None
    genel_toplam: Optional[float] = None
    odeme_yontemi: Optional[str] = None

    @field_validator('ara_toplam', 'toplam_kdv', 'genel_toplam', mode='before')
    @classmethod
    def clean_float(cls, v):
        return _parse_float(v)


# ---------------------------------------------------------------------------
# Teknik Çizim
# ---------------------------------------------------------------------------

class TechnicalDrawingSchema(BaseModel):
    baslik: Optional[str] = None
    olcek: Optional[str] = None
    boyutlar: Optional[str] = None
    malzeme: Optional[str] = None
    notlar: Optional[str] = None


# ---------------------------------------------------------------------------
# Genel Belge
# ---------------------------------------------------------------------------

class GenericDocumentSchema(BaseModel):
    baslik: Optional[str] = None
    icerik_ozeti: Optional[str] = None
    tarih: Optional[str] = None
    yazar: Optional[str] = None
    anahtar_kelimeler: list[str] = []
    ham_metin: Optional[str] = None


# ---------------------------------------------------------------------------
# API request/response modelleri (Faz 5'te kullanılır)
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    document_id: int
    status: str
    message: str


class QuestionRequest(BaseModel):
    document_id: int
    question: str


class QuestionResponse(BaseModel):
    document_id: int
    question: str
    answer: str
    chat_history_length: int


class DocumentInfo(BaseModel):
    id: int
    filename: str
    doc_type: str
    created_at: str
    extracted_data: dict


class RenameRequest(BaseModel):
    filename: str
