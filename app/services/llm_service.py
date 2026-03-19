"""
Faz 3 — LLM Service
Qwen2.5 ile belge üzerinde soru-cevap ve multi-turn conversation.

Özellikler:
  - Sayısal karşılaştırma/sıralama Python'da yapılır, LLM'e sadece yorum yaptırılır
  - Belge dışı sorular Python katmanında reddedilir
  - Belirsiz karşılaştırma sorularında kullanıcıya netleştirme sorusu sorulur
"""
import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Sen VisualMind belge analiz asistanısın.
Sana verilen JSON, bir belgeden çıkarılmış yapılandırılmış veridir.

## Kesin Kurallar

1. SADECE belge JSON'undaki verilerle ilgili sorulara cevap ver.
2. Belgede olmayan bilgiyi uydurma; "Bu bilgi belgede yer almıyor." de.
3. Sayısal hesaplamalar zaten sana HESAPLANMIŞ SONUÇ olarak verilir — bu sonucu kullan, kendin hesaplama yapma.
4. Kısa ve net cevap ver; gereksiz adım adım açıklama yapma.
5. Her zaman Türkçe cevap ver.
6. Belgeyle alakasız bir soru gelirse (hayat tavsiyesi, genel bilgi, tarih, sağlık vb.) SADECE şunu yaz:
   "Bu soru yüklenen belgeyle ilgili değil. Lütfen belge içeriği hakkında bir soru sorun."
   Başka hiçbir şey ekleme."""


# ---------------------------------------------------------------------------
# Off-topic detection (Python katmanı — LLM çağrısı yapılmaz)
# ---------------------------------------------------------------------------

_OFFTOPIC_PATTERNS = [
    r'\b(nasıl|ne yapmalı|tavsiye|öneri)\b.{0,30}\b(insan|yaşam|mutlu|sağlıklı|başarılı|iyi|mutluluk|sevgi|aşk|arkadaş|kariyer)\b',
    r'\bhayat(ım|ta|ın)?\b.{0,20}\b(bağlı|önemli|anlamı|amacı)\b',
    r'\b(hava durumu|borsa|döviz kuru|güncel haber|film öner|yemek tarifi)\b',
    r'\b(politika|futbol|müzik|tarih dersi|coğrafya|astronomi)\b',
]
_OFFTOPIC_RE = [re.compile(p, re.IGNORECASE | re.UNICODE) for p in _OFFTOPIC_PATTERNS]

_DOC_KEYWORDS = {
    'fatura', 'makbuz', 'belge', 'kalem', 'ürün', 'tutar', 'fiyat', 'kdv',
    'miktar', 'adet', 'firma', 'toplam', 'tarih', 'ödeme', 'birim', 'indirim',
    'ağırlık', 'kg', 'litre', 'kilo', 'pahalı', 'ucuz', 'en fazla', 'en az',
    'en çok', 'en büyük', 'en küçük', 'en yüksek', 'en düşük', 'en ağır',
    'kaç', 'ne kadar', 'hangisi', 'hangi', 'nedir', 'var mı', 'listele',
    'özet', 'özetle', 'açıkla', 'göster', 'bilgi', 'içerik',
}


def _is_off_topic(question: str, extracted_data: dict) -> bool:
    q_lower = question.lower()

    for pattern in _OFFTOPIC_RE:
        if pattern.search(q_lower):
            if any(kw in q_lower for kw in _DOC_KEYWORDS):
                return False
            return True

    # Uzun soru + belge kelimesi yok + belge verisiyle örtüşme yok
    q_words = set(re.findall(r'\w+', q_lower))
    if len(question) > 80 and not (q_words & _DOC_KEYWORDS):
        data_tokens: set[str] = set()

        def _collect(obj):
            if isinstance(obj, dict):
                for v in obj.values():
                    _collect(v)
            elif isinstance(obj, list):
                for v in obj:
                    _collect(v)
            elif isinstance(obj, str):
                data_tokens.update(re.findall(r'\w+', obj.lower()))

        _collect(extracted_data)
        if not (q_words & data_tokens):
            return True

    return False


# ---------------------------------------------------------------------------
# Sayısal hesaplama motoru (Python — LLM yapmaz)
# ---------------------------------------------------------------------------

_MAX_KEYWORDS = ['en ağır', 'en büyük', 'en fazla', 'en çok', 'en yüksek',
                 'en pahalı', 'en uzun', 'en geniş', 'maksimum', 'en yüklü']
_MIN_KEYWORDS = ['en hafif', 'en küçük', 'en az', 'en ucuz', 'en düşük',
                 'minimum', 'en kısa', 'en dar']

# Belirsiz alan: hem birim_fiyat hem toplam olabilir
_AMBIGUOUS_FIELD_MAP = {
    'pahalı':  ('birim_fiyat', 'toplam'),
    'ucuz':    ('birim_fiyat', 'toplam'),
    'değerli': ('birim_fiyat', 'toplam'),
}

_FIELD_HINTS = {
    'ağır':    ['agirlik', 'ağırlık', 'miktar', 'kg', 'kilo', 'weight'],
    'hafif':   ['agirlik', 'ağırlık', 'miktar', 'kg', 'kilo', 'weight'],
    'miktar':  ['miktar', 'adet', 'quantity'],
    'adet':    ['adet', 'miktar', 'quantity'],
    'pahalı':  ['toplam', 'birim_fiyat'],
    'ucuz':    ['toplam', 'birim_fiyat'],
    'fiyat':   ['birim_fiyat', 'toplam'],
    'tutar':   ['toplam', 'tutar'],
    'toplam':  ['toplam'],
    'birim':   ['birim_fiyat'],
}


def _get_items_list(extracted_data: dict) -> Optional[list]:
    for key in ('kalemler', 'items', 'urunler', 'ürünler', 'satirlar', 'satırlar'):
        val = extracted_data.get(key)
        if isinstance(val, list) and len(val) > 0:
            return val
    return None


def _detect_field(question: str, item_keys: list) -> Optional[str]:
    q = question.lower()
    for keyword, candidates in _FIELD_HINTS.items():
        if keyword in q:
            for candidate in candidates:
                if candidate in item_keys:
                    return candidate
    # Fallback: ilk sayısal alan
    for key in ('miktar', 'adet', 'toplam', 'birim_fiyat', 'tutar', 'quantity'):
        if key in item_keys:
            return key
    return None


def _check_ambiguous(question: str, items: list) -> Optional[str]:
    """İki farklı sayısal alan varsa netleştirme sorusu döner."""
    q = question.lower()
    if not items:
        return None
    keys = list(items[0].keys())
    for keyword, (field_a, field_b) in _AMBIGUOUS_FIELD_MAP.items():
        if keyword in q:
            has_a = field_a in keys
            has_b = field_b in keys
            if has_a and has_b:
                label_a = 'birim fiyat' if field_a == 'birim_fiyat' else field_a
                label_b = 'toplam tutar' if field_b == 'toplam' else field_b
                return (
                    f"Bu soruyu yanıtlamak için hangi kriteri kullanmamı istersiniz?\n\n"
                    f"- **{label_a.capitalize()}**'a göre mi?\n"
                    f"- **{label_b.capitalize()}**'a göre mi?\n\n"
                    f"Lütfen tercih ettiğiniz kriteri belirtin."
                )
    return None


def _compute_numerical(question: str, extracted_data: dict) -> Optional[str]:
    """
    Max/min hesaplamasını Python'da yapar.
    - Belirsizse __CLARIFICATION__: prefix ile netleştirme mesajı döner
    - Hesaplama yapıldıysa zenginleştirilmiş soru metni döner
    - Uygulanamıyorsa None döner
    """
    q = question.lower()
    items = _get_items_list(extracted_data)
    if not items or not isinstance(items[0], dict):
        return None

    # Belirsizlik kontrolü (önce)
    clarification = _check_ambiguous(question, items)
    if clarification:
        return f"__CLARIFICATION__:{clarification}"

    is_max = any(kw in q for kw in _MAX_KEYWORDS)
    is_min = any(kw in q for kw in _MIN_KEYWORDS)
    if not (is_max or is_min):
        return None

    item_keys = list(items[0].keys())
    field = _detect_field(question, item_keys)
    if not field:
        return None

    name_key = next(
        (k for k in ('aciklama', 'isim', 'ürün', 'urun', 'name', 'ad') if k in item_keys),
        item_keys[0]
    )

    scored = []
    for item in items:
        try:
            val = float(item.get(field, 0) or 0)
            name = str(item.get(name_key, '?'))
            scored.append((name, val))
        except (TypeError, ValueError):
            continue

    if not scored:
        return None

    if is_max:
        winner_name, winner_val = max(scored, key=lambda x: x[1])
        rank_label = 'en yüksek'
    else:
        winner_name, winner_val = min(scored, key=lambda x: x[1])
        rank_label = 'en düşük'

    ranked = sorted(scored, key=lambda x: x[1], reverse=is_max)
    ranked_str = '\n'.join(f"  {i+1}. {n}: {v}" for i, (n, v) in enumerate(ranked))

    return (
        f"{question}\n\n"
        f"[Python hesaplama sonucu — bu sonucu kullan, kendin hesaplama yapma]\n"
        f"Karşılaştırılan alan: {field}\n"
        f"Sıralama:\n{ranked_str}\n"
        f"SONUÇ: {winner_name} ({rank_label} değer = {winner_val})\n"
        f"[Lütfen sadece bu sonucu Türkçe olarak yorumla.]"
    )


# ---------------------------------------------------------------------------
# Conversation Session
# ---------------------------------------------------------------------------

OFFTOPIC_REPLY = (
    "Bu soru yüklenen belgeyle ilgili değil. "
    "Lütfen belge içeriği hakkında bir soru sorun."
)


class ConversationSession:
    """Tek bir belgeye ait konuşma oturumu."""

    def __init__(self, document_id: int, extracted_data: dict):
        self.document_id = document_id
        self.extracted_data = extracted_data
        self.history: list[dict] = []

    def _build_messages(self, question: str) -> list[dict]:
        context_json = json.dumps(self.extracted_data, ensure_ascii=False, indent=2)
        system_content = f"{SYSTEM_PROMPT}\n\nBELGE VERİSİ:\n```json\n{context_json}\n```"
        messages = [{"role": "system", "content": system_content}]
        messages.extend(self.history)
        messages.append({"role": "user", "content": question})
        return messages

    async def ask(self, question: str) -> str:
        # 1. Off-topic kontrolü
        if _is_off_topic(question, self.extracted_data):
            logger.info(f"Off-topic reddedildi (doc_id={self.document_id}): {question[:60]}")
            self.history.append({"role": "user", "content": question})
            self.history.append({"role": "assistant", "content": OFFTOPIC_REPLY})
            return OFFTOPIC_REPLY

        # 2. Sayısal hesaplama / belirsizlik
        numerical_result = _compute_numerical(question, self.extracted_data)
        if numerical_result:
            if numerical_result.startswith("__CLARIFICATION__:"):
                clarification = numerical_result[len("__CLARIFICATION__:"):]
                logger.info(f"Belirsiz soru, netleştirme istendi (doc_id={self.document_id})")
                self.history.append({"role": "user", "content": question})
                self.history.append({"role": "assistant", "content": clarification})
                return clarification
            effective_question = numerical_result
            logger.info(f"Sayısal hesaplama Python'da yapıldı, alan: field (doc_id={self.document_id})")
        else:
            effective_question = question

        # 3. LLM çağrısı
        messages = self._build_messages(effective_question)
        payload = {
            "model": settings.LLM_MODEL,
            "messages": messages,
            "stream": False,
            "keep_alive": 0,
            "options": {"temperature": 0.2},
        }

        logger.info(f"LLM sorusu gönderiliyor (doc_id={self.document_id}): {question[:60]}...")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()

        answer = response.json()["message"]["content"]

        self.history.append({"role": "user", "content": question})
        self.history.append({"role": "assistant", "content": answer})

        logger.info("LLM cevabı alındı.")
        return answer

    def clear_history(self):
        self.history = []


# ---------------------------------------------------------------------------
# Oturum yöneticisi
# ---------------------------------------------------------------------------

_sessions: dict[int, ConversationSession] = {}


def get_or_create_session(document_id: int, extracted_data: dict) -> ConversationSession:
    if document_id not in _sessions:
        _sessions[document_id] = ConversationSession(document_id, extracted_data)
    return _sessions[document_id]


def clear_session(document_id: int):
    _sessions.pop(document_id, None)
