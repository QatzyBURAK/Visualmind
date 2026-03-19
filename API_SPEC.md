# VisualMind API Specification

**Base URL:** `http://localhost:8080`
**API Prefix:** `/api/v1`
**Swagger UI:** http://localhost:8080/docs
**OpenAPI JSON:** http://localhost:8080/openapi.json

---

## Endpoints

### 1. POST /api/v1/documents/upload

Görsel veya PDF dosyası yükler. Arka planda VLM analizi başlatılır.

**Request:** `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `file` | file | Evet | Yüklenecek dosya (.jpg, .jpeg, .png, .pdf) |
| `doc_type` | string | Hayır | Belge tipi: `invoice`, `receipt`, `technical`, `generic` (varsayılan: `generic`) |

**Örnek curl:**
```bash
curl -X POST "http://localhost:8080/api/v1/documents/upload" \
  -F "file=@test_fatura.png" \
  -F "doc_type=invoice"
```

**Response (200 OK):**
```json
{
  "document_id": 4,
  "status": "processing",
  "message": "Belge alındı, analiz arka planda başlatıldı."
}
```

**Hata Durumları:**
- `422` — Desteklenmeyen dosya formatı veya dosya çok büyük (max 20 MB)

---

### 2. GET /api/v1/documents

Tüm yüklü belgeleri listeler.

**Request:** Parametre yok.

**Örnek curl:**
```bash
curl "http://localhost:8080/api/v1/documents"
```

**Response (200 OK):**
```json
[
  {
    "id": 4,
    "filename": "test_fatura.png",
    "doc_type": "invoice",
    "created_at": "2026-03-18 23:45:39"
  },
  {
    "id": 3,
    "filename": "test_fatura.png",
    "doc_type": "invoice",
    "created_at": "2026-03-18 23:20:41"
  }
]
```

---

### 3. GET /api/v1/documents/{document_id}

Tek bir belgenin bilgilerini ve VLM tarafından çıkarılan yapılandırılmış veriyi döner.

**Path Parameter:** `document_id` (integer)

**Örnek curl:**
```bash
curl "http://localhost:8080/api/v1/documents/4"
```

**Response (200 OK) — Fatura belgesi:**
```json
{
  "id": 4,
  "filename": "test_fatura.png",
  "doc_type": "invoice",
  "created_at": "2026-03-18 23:45:39",
  "extracted_data": {
    "firma_adi": "DEMO TEKNOLOJİ A.Ş.",
    "tarih": "19.03.2024",
    "fatura_no": "INV-2024-0042",
    "toplam_tutar": 2922.0,
    "kdv_tutari": 487.0,
    "kdv_orani": 20.0,
    "kalemler": [
      {
        "aciklama": "Laptop Stand",
        "miktar": 2.0,
        "birim_fiyat": 450.0,
        "toplam": 900.0
      },
      {
        "aciklama": "USB-C Kablosu",
        "miktar": 5.0,
        "birim_fiyat": 85.0,
        "toplam": 425.0
      },
      {
        "aciklama": "Mouse Pad",
        "miktar": 3.0,
        "birim_fiyat": 120.0,
        "toplam": 360.0
      },
      {
        "aciklama": "Webcam",
        "miktar": 1.0,
        "birim_fiyat": 750.0,
        "toplam": 750.0
      }
    ],
    "notlar": "Zamanında ödeme için teşekkürler."
  }
}
```

**Hata Durumları:**
- `404` — Belge bulunamadı

> **Not:** Belge yüklendikten hemen sonra VLM analizi arka planda çalışır. `extracted_data` boş `{}` dönüyorsa birkaç saniye bekleyip tekrar isteyin.

---

### 4. POST /api/v1/documents/{document_id}/ask

Belge hakkında doğal dilde soru sorar. Multi-turn konuşmayı destekler — LLM önceki sorular ve cevapları hatırlar.

**Path Parameter:** `document_id` (integer)

**Request Body (JSON):**

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `document_id` | integer | Evet | Path parametresiyle aynı olmalı |
| `question` | string | Evet | Sorulan soru metni |

**Örnek curl:**
```bash
curl -X POST "http://localhost:8080/api/v1/documents/4/ask" \
  -H "Content-Type: application/json" \
  -d '{"document_id": 4, "question": "Bu faturanın toplam tutarı nedir?"}'
```

**Response (200 OK):**
```json
{
  "document_id": 4,
  "question": "Bu faturanın toplam tutarı nedir?",
  "answer": "Bu faturanın toplam tutarı 2922.0 TL'dir.",
  "chat_history_length": 2
}
```

**Multi-turn örnek — 2. soru:**
```bash
curl -X POST "http://localhost:8080/api/v1/documents/4/ask" \
  -H "Content-Type: application/json" \
  -d '{"document_id": 4, "question": "Peki KDV tutarı doğru mu hesaplanmış?"}'
```

**Response:**
```json
{
  "document_id": 4,
  "question": "Peki KDV tutarı doğru mu hesaplanmış?",
  "answer": "Evet, KDV tutarı doğru hesaplanmıştır. Toplam tutar 2922.0 TL'dir ve KDV oranı 20.0% olarak verilmiştir. Bu durumda KDV tutarı:\n\nKDV Tutarı = Toplam Tutar × (KDV Oranı / 100)\nKDV Tutarı = 2922.0 × (20 / 100) = 584.4\n\nAncak belgede KDV tutarı 487.0 TL olarak belirtilmiştir.",
  "chat_history_length": 6
}
```

**Hata Durumları:**
- `404` — Belge bulunamadı
- `422` — Belge henüz analiz edilmedi (VLM işlemi devam ediyor)

> **Not:** `chat_history_length` her soru-cevap turunda 2 artar (1 user + 1 assistant mesajı). Konuşma geçmişi hem bellekte hem de veritabanında saklanır.

---

### 5. DELETE /api/v1/documents/{document_id}/history

Belgeye ait konuşma geçmişini bellekten temizler (DB'yi silmez).

**Path Parameter:** `document_id` (integer)

**Örnek curl:**
```bash
curl -X DELETE "http://localhost:8080/api/v1/documents/4/history"
```

**Response (200 OK):**
```json
{
  "message": "Konuşma geçmişi temizlendi."
}
```

---

### 6. DELETE /api/v1/documents/{document_id}

Belgeyi, ilişkili tüm kayıtları ve dosyayı kalıcı olarak siler.

**Path Parameter:** `document_id` (integer)

**Silinen veriler:**
- `documents` tablosundan kayıt
- `extractions` tablosundan ilişkili kayıtlar (cascade)
- `chat_history` tablosundan ilişkili mesajlar (cascade)
- `invoices` tablosundan ilişkili kayıtlar (cascade)
- `uploads/` klasöründeki fiziksel dosya
- ChromaDB'deki embedding vektörü
- Bellekteki konuşma oturumu

**Örnek curl:**
```bash
curl -X DELETE "http://localhost:8080/api/v1/documents/4"
```

**Response (200 OK):**
```json
{
  "message": "Belge silindi."
}
```

**Hata Durumları:**
- `404` — Belge bulunamadı

---

### 7. GET /api/v1/documents/{document_id}/status

Frontend polling için belge işlem durumunu döner.

**Path Parameter:** `document_id` (integer)

**Örnek curl:**
```bash
curl "http://localhost:8080/api/v1/documents/4/status"
```

**Response (200 OK) — İşlem devam ediyor:**
```json
{
  "status": "processing",
  "document_id": 4
}
```

**Response (200 OK) — Hazır:**
```json
{
  "status": "ready",
  "document_id": 4
}
```

**Hata Durumları:**
- `404` — Belge bulunamadı

> **Not:** Upload sonrası bu endpoint'i polling yaparak `status: "ready"` gelene kadar bekleyin. Hazır olduğunda `GET /documents/{id}` ile veriyi çekin.

---

### 8. GET /api/v1/documents/{document_id}/history

Belgeye ait tüm chat mesajlarını döner.

**Path Parameter:** `document_id` (integer)

**Örnek curl:**
```bash
curl "http://localhost:8080/api/v1/documents/4/history"
```

**Response (200 OK):**
```json
[
  {
    "role": "user",
    "content": "Bu faturanın toplam tutarı nedir?",
    "created_at": "2026-03-19 10:23:45"
  },
  {
    "role": "assistant",
    "content": "Bu faturanın toplam tutarı 2922.0 TL'dir.",
    "created_at": "2026-03-19 10:23:47"
  }
]
```

**Hata Durumları:**
- `404` — Belge bulunamadı

---

### 9. POST /api/v1/search

Sorguya anlamsal olarak en yakın belgeleri döner (ChromaDB RAG).

> **Uyarı:** ChromaDB servisi çalışmıyorsa bu endpoint hata verir. ChromaDB opsiyoneldir; diğer endpointler ChromaDB olmadan çalışır.

**Query Parameter:** `query` (string)

**Örnek curl:**
```bash
curl -X POST "http://localhost:8080/api/v1/search?query=KDV%20fatura"
```

**Response (200 OK):**
```json
{
  "query": "KDV fatura",
  "results": [
    {
      "id": 4,
      "filename": "test_fatura.png",
      "doc_type": "invoice"
    }
  ]
}
```

---

## Akış Diyagramı

```
1. POST /documents/upload          →  document_id alınır, status: "processing"
2. GET  /documents/{id}/status     →  "processing" → "ready" olana kadar polling yap
3. GET  /documents/{id}            →  extracted_data ile belge verisini al
4. POST /documents/{id}/ask        →  Soru sor, cevap al (multi-turn)
5. GET  /documents/{id}/history    →  Tüm konuşma geçmişini al (isteğe bağlı)
6. DELETE /documents/{id}/history  →  Konuşmayı sıfırla (isteğe bağlı)
7. DELETE /documents/{id}          →  Belgeyi tamamen sil (isteğe bağlı)
```

---

## Desteklenen Belge Tipleri ve extracted_data Yapısı

### `invoice` (Fatura)
```json
{
  "firma_adi": "string",
  "tarih": "string",
  "fatura_no": "string",
  "toplam_tutar": "float",
  "kdv_tutari": "float",
  "kdv_orani": "float",
  "kalemler": [
    {"aciklama": "string", "miktar": "float", "birim_fiyat": "float", "toplam": "float"}
  ],
  "notlar": "string"
}
```

### `receipt` (Makbuz)
```json
{
  "magaza_adi": "string",
  "tarih": "string",
  "toplam_tutar": "float",
  "odeme_yontemi": "string",
  "kalemler": [...]
}
```

### `technical` (Teknik Çizim)
```json
{
  "baslik": "string",
  "olcek": "string",
  "boyutlar": "string",
  "malzeme": "string",
  "notlar": "string"
}
```

### `generic` (Genel Belge)
```json
{
  "baslik": "string",
  "icerik_ozeti": "string",
  "tarih": "string",
  "yazar": "string",
  "anahtar_kelimeler": ["string"],
  "ham_metin": "string"
}
```

---

## Modeller ve Servisler

| Servis | Model | Açıklama |
|--------|-------|----------|
| VLM (Görsel Analiz) | `qwen2.5vl:7b` | Görselden yapılandırılmış veri çıkarır |
| LLM (Soru-Cevap) | `qwen2.5:7b-instruct-q4_K_M` | Multi-turn konuşma |
| Embedding (RAG) | `nomic-embed-text` | ChromaDB için vektör üretir |

**Ollama URL:** `http://localhost:11434`
**ChromaDB:** Embedded (PersistentClient) — `./chroma_data/` klasörüne yazılır, ayrı servis gerekmez
**MySQL:** `localhost:3306` / DB: `visualmind`

---

## CORS / Frontend Notları

- Şu anda CORS ayarı `*` (tüm origin'ler) — production'da kısıtlanmalı
- Upload için `multipart/form-data` kullanılmalı, `application/json` değil
- Tüm cevaplar UTF-8 JSON döner
- Büyük dosyalar (>20MB) `422` döner
- VLM analizi 30-120 saniye sürebilir; frontend polling yapmalı (`GET /documents/{id}` ile `extracted_data` dolana kadar)
