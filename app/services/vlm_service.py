"""
Faz 2 — VLM Service
Qwen2-VL ile görsel okuma ve structured JSON çıktı üretme.
"""
import base64
import json
import logging
from pathlib import Path

import httpx

from app.core.config import settings
from app.schemas import (
    GenericDocumentSchema,
    InvoiceSchema,
    ReceiptSchema,
    TechnicalDrawingSchema,
)

logger = logging.getLogger(__name__)

# Her belge tipi için prompt şablonları
PROMPTS = {
    "invoice": """Bu görseldeki faturadan aşağıdaki bilgileri JSON formatında çıkar:
firma_adi, tarih, fatura_no, toplam_tutar, kdv_tutari, kdv_orani,
kalemler (aciklama, miktar, birim_fiyat, toplam içeren liste), notlar.

KRİTİK DOĞRULAMA: Her kalem için miktar × birim_fiyat = toplam olmalı.
Eğer tutmuyorsa birim_fiyat yanlış okunmuş demektir — toplam ÷ miktar ile düzelt.
notlar alanı string olmalı, dict/obje döndürme.
Eğer bir bilgi yoksa null döndür. Sadece JSON döndür, açıklama ekleme.""",

    "receipt": """Bu fiş/makbuzdan bilgileri JSON formatında çıkar.
Alan adları: magaza_adi, tarih, saat, fis_no,
kalemler (her kalem için: urun_adi, miktar, birim(KG/ADET/LT), birim_fiyat, kdv_orani, toplam),
ara_toplam, toplam_kdv, genel_toplam, odeme_yontemi.

KRİTİK DOĞRULAMA: Her kalem için miktar × birim_fiyat = toplam olmalı.
Eğer tutmuyorsa birim_fiyat yanlış okunmuş demektir — toplam ÷ miktar ile birim_fiyat'ı hesapla ve düzelt.
Örnek: miktar=2.25, toplam=13.50 → birim_fiyat = 13.50 ÷ 2.25 = 6.00

Eğer bir bilgi yoksa null döndür. Sadece JSON döndür, açıklama ekleme.""",

    "technical": """Bu teknik çizimden aşağıdaki bilgileri JSON formatında çıkar:
baslik, olcek, boyutlar, malzeme, notlar.
Eğer bir bilgi yoksa null döndür. Sadece JSON döndür, açıklama ekleme.""",

    "generic": """Bu belgeden şu bilgileri JSON formatında çıkar:
baslik, icerik_ozeti (max 200 karakter özet), tarih, yazar, anahtar_kelimeler (max 5 kelime liste).
ham_metin alanını EKLEME. Eğer bilgi yoksa null döndür. Sadece JSON döndür.""",
}

SCHEMA_MAP = {
    "invoice": InvoiceSchema,
    "receipt": ReceiptSchema,
    "technical": TechnicalDrawingSchema,
    "generic": GenericDocumentSchema,
}


def _encode_image(image_path: str) -> str:
    """Görseli base64'e çevirir."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _repair_truncated_json(text: str) -> str:
    """Kesilmiş JSON'ı kapatmaya çalışır."""
    # Açık string varsa kapat
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\':
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
    if in_string:
        text += '"'

    # Açık parantez/köşeli parantezleri kapat
    stack = []
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\':
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string:
            if ch in '{[':
                stack.append(ch)
            elif ch in '}]':
                if stack:
                    stack.pop()

    for opener in reversed(stack):
        text += '}' if opener == '{' else ']'

    return text


def _extract_json(text: str) -> dict:
    """LLM çıktısından JSON bloğunu ayıklar. Kesilmiş JSON'ı onarmaya çalışır."""
    text = text.strip()
    # Markdown kod bloğu varsa temizle
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    # Önce direkt parse dene
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Kesilmiş JSON ise onarmayı dene
    repaired = _repair_truncated_json(text)
    return json.loads(repaired)


DETECT_PROMPT = """Bu görseldeki belge türünü belirle. Sadece şu dört seçenekten birini yaz:
- invoice  (resmi fatura, e-fatura, KDV faturası — firma adı + fatura numarası + kalemler + imza/kaşe)
- receipt  (fiş, yazar kasa fişi, market/restoran makbuzu — FİŞ NO veya küçük termal baskı kağıdı)
- technical (teknik çizim, şema, plan, blueprint)
- generic  (diğer tüm belgeler)

NOT: "Perakende Satış Fişi", "Bilgi Fişidir", "FİŞ NO" içeren belgeler → receipt
Cevabın sadece tek kelime olsun."""


async def _detect_doc_type(image_b64: str) -> str:
    """VLM ile belge tipini otomatik tespit eder."""
    payload = {
        "model": settings.VLM_MODEL,
        "prompt": DETECT_PROMPT,
        "images": [image_b64],
        "stream": False,
        "keep_alive": 0,
        "options": {"temperature": 0.0, "num_predict": 10},
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json=payload,
        )
        response.raise_for_status()
    result = response.json()["response"].strip().lower().split()[0]
    return result if result in PROMPTS else "generic"


async def analyze_image(image_path: str, doc_type: str = "generic") -> dict:
    """
    Görseli Qwen2-VL ile analiz eder, yapılandırılmış JSON döner.

    Args:
        image_path: Görsel dosyasının yolu
        doc_type: 'invoice' | 'receipt' | 'technical' | 'generic' | 'auto'

    Returns:
        Pydantic schema'ya göre doğrulanmış dict
    """
    image_b64 = _encode_image(image_path)

    # Otomatik tespit: kullanıcı "generic" seçtiyse veya "auto" geldiyse
    if doc_type not in PROMPTS or doc_type == "generic":
        detected = await _detect_doc_type(image_b64)
        if detected != "generic":
            logger.info(f"Belge tipi otomatik tespit edildi: {detected} (kullanıcı seçimi: {doc_type})")
            doc_type = detected
        elif doc_type not in PROMPTS:
            doc_type = "generic"

    logger.info(f"VLM analizi başlıyor: {image_path} (tip: {doc_type})")

    prompt = PROMPTS[doc_type]

    suffix = Path(image_path).suffix.lower()
    mime = "image/jpeg" if suffix in (".jpg", ".jpeg") else "image/png"

    payload = {
        "model": settings.VLM_MODEL,
        "prompt": prompt,
        "images": [image_b64],
        "stream": False,
        "keep_alive": 0,  # RAM'i hemen serbest bırak
        "options": {"temperature": 0.1, "num_predict": 2048},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json=payload,
        )
        response.raise_for_status()

    raw_text = response.json()["response"]
    logger.info(f"VLM ham çıktısı alındı, parse ediliyor...")

    try:
        raw_dict = _extract_json(raw_text)
        schema_class = SCHEMA_MAP[doc_type]
        validated = schema_class(**raw_dict)
        result = validated.model_dump()
        logger.info("JSON parse başarılı.")
        return result
    except Exception as e:
        logger.warning(f"JSON parse hatası: {e}. Ham metin döndürülüyor.")
        return {"ham_metin": raw_text, "parse_hatasi": str(e)}
