# VisualMind — Yapay Zeka Destekli Belge Analizi

> **Açık kaynak Vision-Language Model ile çalışan, tamamen şirket içinde (on-premise) konuşlandırılabilen belge analiz platformu.**
> Fatura, makbuz ve teknik çizimlerden otomatik veri çıkar, belgelerinizle yapay zeka destekli sohbet et. Verileriniz hiçbir zaman sunucularından ayrılmaz.

---

## VisualMind Nedir?

VisualMind, kurumların iş belgelerini (fatura, makbuz, teknik çizim, genel belgeler) yükleyip şunları yapmasını sağlayan bir platformdur:

- **Otomatik veri çıkarma** — Vision-Language Model (VLM) ile belge içeriğini yapılandırılmış veriye dönüştürür
- **Belgeyle sohbet** — Çok turlu yapay zeka asistanıyla doğal dilde soru sor
- **Anlamsal arama** — Vektör gömüleri ile belgeler arasında anlama dayalı arama yap
- **Belge yönetimi** — Yeniden adlandır, filtrele, sil, dışa aktar

Tüm yapay zeka işlemleri [Ollama](https://ollama.com) üzerinden yerel olarak çalışır — hiçbir veri dış API'lere gönderilmez.

---

## Özellikler

| Özellik | Açıklama |
|---|---|
| VLM ile Veri Çıkarma | Qwen2.5-VL belge içeriğini otomatik okur ve yapılandırır |
| Çok Turlu Sohbet | Herhangi bir belge hakkında takip soruları sorabilirsin |
| Anlamsal Arama | Belgeler arasında anlam bazlı arama |
| Geniş Format Desteği | JPG, PNG, WebP, BMP, GIF, TIFF, PDF (gerektiğinde otomatik dönüştürülür) |
| Tam On-Premise | Kendi altyapında, tamamen çevrimdışı çalışır |
| REST API | `/docs` adresinde Swagger/OpenAPI dokümantasyonu |
| Sohbet Dışa Aktarma | `.txt` veya `.md` formatında sohbet geçmişini indir |
| Veri CSV Export | Çıkarılan verileri CSV olarak dışa aktar |

---

## Mimari

```
┌─────────────────────────────────────────────┐
│                 Tarayıcı                    │
│         React + TypeScript (Vite)           │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────┐
│          FastAPI Backend (Python)           │
│  • Belge yükleme ve yönetimi               │
│  • VLM analizi (arka plan görevi)           │
│  • LLM sohbet ve geçmiş                    │
│  • Anlamsal arama (RAG)                    │
└──────┬──────────────┬───────────────┬───────┘
       │              │               │
  ┌────▼────┐   ┌─────▼────┐   ┌─────▼──────┐
  │  MySQL  │   │ ChromaDB │   │   Ollama   │
  │   8.0   │   │ (vektör) │   │  (modeller)│
  └─────────┘   └──────────┘   └────────────┘
```

**Kullanılan modeller (Ollama üzerinden):**
- `qwen2.5vl:7b` — Belge analizi için Vision-Language Model
- `qwen2.5:7b-instruct-q4_K_M` — Sohbet için LLM
- `nomic-embed-text` — Anlamsal arama için gömü modeli

---

## Donanım Gereksinimleri

> VisualMind yapay zeka modellerini yerel olarak çalıştırır. Yeterli GPU/CPU kaynağı gereklidir.

| Bileşen | Minimum | Önerilen |
|---|---|---|
| **GPU** | NVIDIA 8 GB VRAM (RTX 3070 / A10) | NVIDIA 16+ GB VRAM (RTX 4090 / A100) |
| **RAM** | 16 GB | 32 GB |
| **İşlemci** | 8 çekirdek | 16+ çekirdek |
| **Depolama** | 50 GB boş alan | 100+ GB SSD |
| **İşletim Sistemi** | Ubuntu 22.04 / Windows 11 | Ubuntu 22.04 LTS |

> **Not:** GPU olmadan Ollama CPU'ya geri düşer. 7B VLM modeli yalnızca CPU ile çok yavaş çalışır (belge başına 5–15 dakika). Üretim kullanımı için NVIDIA GPU şiddetle önerilir.

---

## Yazılım Gereksinimleri

Kuruluma başlamadan önce aşağıdakileri yükle:

| Yazılım | Versiyon | Link |
|---|---|---|
| **Docker** | 24+ | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.20+ | Docker Desktop ile birlikte gelir |
| **Ollama** | Son sürüm | https://ollama.com/download |
| **Node.js** *(yalnızca frontend)* | 18+ | https://nodejs.org |
| **Python** *(manuel kurulum)* | 3.11+ | https://python.org |

---

## Hızlı Başlangıç — Docker Compose (Önerilen)

### 1. Repoyu klonla

```bash
git clone https://github.com/QatzyBURAK/Visualmind.git
cd Visualmind
```

### 2. Ortam değişkenlerini ayarla

```bash
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
# MySQL — şifreyi mutlaka değiştir
MYSQL_PASSWORD=guclu_sifren_buraya
MYSQL_DB=visualmind

# Modeller (varsayılanlar kutudan çıkar çalışır)
VLM_MODEL=qwen2.5vl:7b
LLM_MODEL=qwen2.5:7b-instruct-q4_K_M
EMBED_MODEL=nomic-embed-text
```

### 3. Yapay zeka modellerini indir

```bash
# Ollama'yı başlat (servis olarak çalışmıyorsa)
ollama serve

# Gerekli modelleri indir (tek seferlik, ~15 GB)
ollama pull qwen2.5vl:7b
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull nomic-embed-text
```

> Model indirme internet hızına bağlı olarak 10–30 dakika sürebilir.

### 4. Servisleri başlat

```bash
docker compose up -d
```

Başlatılan servisler:
- `visualmind_backend` → port **8100**
- `visualmind_mysql` → port **3306**
- `visualmind_chromadb` → port **8001**
- `visualmind_ollama` → port **11434**

### 5. Frontend'i derle ve yayınla

```bash
cd frontend
npm install
npm run build
```

`frontend/dist/` klasörünü Nginx, Caddy veya herhangi bir statik dosya sunucusuyla yayınla:

```nginx
# Örnek Nginx yapılandırması
server {
    listen 80;
    root /visualmind/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api { proxy_pass http://localhost:8100; }
}
```

Geliştirme/test için:

```bash
npm run dev   # http://localhost:5173 adresinde çalışır
```

### 6. Doğrula

- Frontend: http://localhost:5173 (geliştirme) veya http://sunucun (üretim)
- Backend API: http://localhost:8100/docs
- Sağlık kontrolü: http://localhost:8100/health

---

## Manuel Kurulum (Docker Olmadan)

### Backend

```bash
# Sanal ortam oluştur
python3.11 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını MySQL bilgilerin ve model isimleriyle düzenle

# Backend'i başlat
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
```

### MySQL

```sql
CREATE DATABASE visualmind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

ORM ilk başlatmada tüm tabloları otomatik oluşturur.

---

## Yapılandırma Referansı

Tüm ayarlar `.env` üzerinden yönetilir. Şablon için `.env.example` dosyasına bak.

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API adresi |
| `VLM_MODEL` | `qwen2.5vl:7b` | Belge analizi için görsel model |
| `LLM_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | Sohbet modeli |
| `EMBED_MODEL` | `nomic-embed-text` | Arama için gömü modeli |
| `MYSQL_HOST` | `localhost` | MySQL sunucusu |
| `MYSQL_PORT` | `3306` | MySQL portu |
| `MYSQL_USER` | `root` | MySQL kullanıcısı |
| `MYSQL_PASSWORD` | — | **Zorunlu.** MySQL şifresi |
| `MYSQL_DB` | `visualmind` | Veritabanı adı |
| `MAX_FILE_SIZE_MB` | `20` | Maksimum yükleme boyutu |
| `UPLOAD_DIR` | `uploads` | Yüklenen dosyaların dizini |

---

## Desteklenen Belge Türleri

| Tür | Açıklama | Çıkarılan Alanlar |
|---|---|---|
| **Fatura** | Kurumlar arası faturalar | Firma adı, tarih, fatura no, kalemler, KDV, toplam |
| **Makbuz** | Perakende fişleri | Mağaza, tarih, ürünler, ara toplam, KDV, ödeme yöntemi |
| **Teknik Çizim** | Mühendislik belgeleri | Başlık, ölçek, boyutlar, malzeme, notlar |
| **Genel** | Diğer belgeler | Başlık, özet, tarih, yazar, anahtar kelimeler |

---

## API Dokümantasyonu

```
http://sunucun:8100/docs      # Swagger UI
http://sunucun:8100/redoc     # ReDoc
```

### Temel Uç Noktalar

| Method | Uç Nokta | Açıklama |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Belge yükle |
| `GET` | `/api/v1/documents` | Tüm belgeleri listele |
| `GET` | `/api/v1/documents/{id}` | Belge + çıkarılan veriyi getir |
| `GET` | `/api/v1/documents/{id}/status` | İşleme durumunu sorgula |
| `PATCH` | `/api/v1/documents/{id}` | Belgeyi yeniden adlandır |
| `DELETE` | `/api/v1/documents/{id}` | Belgeyi ve tüm verileri sil |
| `POST` | `/api/v1/documents/{id}/ask` | Belge hakkında soru sor |
| `GET` | `/api/v1/documents/{id}/history` | Sohbet geçmişini getir |
| `DELETE` | `/api/v1/documents/{id}/history` | Sohbet geçmişini temizle |
| `POST` | `/api/v1/search` | Belgeler arasında anlamsal arama |

---

## Kurumsal Müşteriler İçin

### Veri Gizliliği

VisualMind, **veri gizliliğinin tartışmaya kapalı olduğu** kurumlar için tasarlanmıştır:

- **Dış API çağrısı yok** — tüm yapay zeka işlemleri Ollama üzerinden kendi donanımında çalışır
- **Telemetri yok** — kullanım verisi toplanmaz veya iletilmez
- **Bulut bağımlılığı yok** — model indirildikten sonra tamamen çevrimdışı çalışır
- **Belgeler sunucularından ayrılmaz** — yüklenen dosyalar ve çıkarılan veriler hiçbir zaman kendi altyapının dışına çıkmaz

### Ölçeklendirme

- Yüksek belge hacmi için Ollama'yı ayrı bir GPU sunucusuna kur, `OLLAMA_BASE_URL`'yi ona yönlendir
- MySQL ve ChromaDB yönetilen servislere taşınabilir (AWS RDS, GCP Cloud SQL vb.)
- FastAPI backend durumsuz (stateless) yapıdadır, yük dengeleyici arkasında yatay ölçeklendirilebilir

### Yedekleme

Düzenli olarak yedeklenmesi gereken kritik veriler:

```bash
# MySQL (tüm belgeler, çıkarmalar, sohbet geçmişi)
mysqldump -u root -p visualmind > yedek_$(date +%Y%m%d).sql

# ChromaDB (vektör gömüleri)
tar -czf chroma_yedek_$(date +%Y%m%d).tar.gz chroma_data/

# Yüklenen dosyalar
tar -czf uploads_yedek_$(date +%Y%m%d).tar.gz uploads/
```

---

## Teknoloji Yığını

**Backend:** Python 3.11, FastAPI, SQLAlchemy, ChromaDB, Ollama (httpx)
**Frontend:** React 18, TypeScript, Vite, Axios, react-markdown
**Veritabanı:** MySQL 8.0
**Vektör DB:** ChromaDB
**Yapay Zeka Modelleri:** Qwen2.5-VL 7B, Qwen2.5 7B, nomic-embed-text (Ollama üzerinden)
**Konteynerizasyon:** Docker, Docker Compose

---

## Lisans

Bu proje **GNU Affero General Public License v3.0 (AGPL-3.0)** lisansı altında yayınlanmıştır.
Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
