# VisualMind — AI-Powered Document Analysis

> **Open-source Vision-Language Model document analysis platform — fully on-premise.**
> Automatically extract structured data from invoices, receipts, and technical drawings. Chat with your documents using AI. Your data never leaves your servers.

🇹🇷 [Türkçe README için tıklayın](README.tr.md)

---

## What is VisualMind?

VisualMind is a platform that allows organizations to upload business documents (invoices, receipts, technical drawings, general documents) and:

- **Automatic data extraction** — Vision-Language Model (VLM) converts document content into structured data
- **Chat with documents** — Ask questions in natural language with a multi-turn AI assistant
- **Semantic search** — Meaning-based search across documents using vector embeddings
- **Document management** — Rename, filter, delete, export

All AI processing runs locally via [Ollama](https://ollama.com) — no data is sent to external APIs.

---

## Features

| Feature | Description |
|---|---|
| VLM Data Extraction | Qwen2.5-VL automatically reads and structures document content |
| Multi-turn Chat | Ask follow-up questions about any document |
| Semantic Search | Meaning-based search across all documents |
| Wide Format Support | JPG, PNG, WebP, BMP, GIF, TIFF, PDF (auto-converted when needed) |
| Fully On-Premise | Runs on your own infrastructure, completely offline |
| REST API | Swagger/OpenAPI docs at `/docs` |
| Chat Export | Download chat history as `.txt` or `.md` |
| CSV Data Export | Export extracted data as CSV |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│         React + TypeScript (Vite)           │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────┐
│          FastAPI Backend (Python)           │
│  • Document upload and management          │
│  • VLM analysis (background task)          │
│  • LLM chat and history                    │
│  • Semantic search (RAG)                   │
└──────┬──────────────┬───────────────┬───────┘
       │              │               │
  ┌────▼────┐   ┌─────▼────┐   ┌─────▼──────┐
  │  MySQL  │   │ ChromaDB │   │   Ollama   │
  │   8.0   │   │ (vector) │   │  (models)  │
  └─────────┘   └──────────┘   └────────────┘
```

**Models used (via Ollama):**
- `qwen2.5vl:7b` — Vision-Language Model for document analysis
- `qwen2.5:7b-instruct-q4_K_M` — LLM for chat
- `nomic-embed-text` — Embedding model for semantic search

---

## Hardware Requirements

> VisualMind runs AI models locally. Sufficient GPU/CPU resources are required.

| Component | Minimum | Recommended |
|---|---|---|
| **GPU** | NVIDIA 8 GB VRAM (RTX 3070 / A10) | NVIDIA 16+ GB VRAM (RTX 4090 / A100) |
| **RAM** | 16 GB | 32 GB |
| **CPU** | 8 cores | 16+ cores |
| **Storage** | 50 GB free | 100+ GB SSD |
| **OS** | Ubuntu 22.04 / Windows 11 | Ubuntu 22.04 LTS |

> **Note:** Without a GPU, Ollama falls back to CPU. The 7B VLM model runs very slowly on CPU only (5–15 minutes per document). An NVIDIA GPU is strongly recommended for production use.

---

## Software Prerequisites

Install the following before getting started:

| Software | Version | Link |
|---|---|---|
| **Docker** | 24+ | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.20+ | Included with Docker Desktop |
| **Ollama** | Latest | https://ollama.com/download |
| **Node.js** *(frontend only)* | 18+ | https://nodejs.org |
| **Python** *(manual install only)* | 3.11+ | https://python.org |

---

## Quick Start — Docker Compose (Recommended)

### 1. Clone the repository

```bash
git clone https://github.com/QatzyBURAK/Visualmind.git
cd Visualmind
```

### 2. Set environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# MySQL — change this password
MYSQL_PASSWORD=your_strong_password_here
MYSQL_DB=visualmind

# Models (defaults work out of the box)
VLM_MODEL=qwen2.5vl:7b
LLM_MODEL=qwen2.5:7b-instruct-q4_K_M
EMBED_MODEL=nomic-embed-text
```

### 3. Download AI models

```bash
# Start Ollama (if not running as a service)
ollama serve

# Pull required models (one-time, ~15 GB)
ollama pull qwen2.5vl:7b
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull nomic-embed-text
```

> Model download may take 10–30 minutes depending on your internet speed.

### 4. Start services

```bash
docker compose up -d
```

Services started:
- `visualmind_backend` → port **8100**
- `visualmind_mysql` → port **3306**
- `visualmind_chromadb` → port **8001**
- `visualmind_ollama` → port **11434**

### 5. Build and serve the frontend

```bash
cd frontend
npm install
npm run build
```

Serve `frontend/dist/` with Nginx, Caddy, or any static file server:

```nginx
# Example Nginx config
server {
    listen 80;
    root /visualmind/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api { proxy_pass http://localhost:8100; }
}
```

For development/testing:

```bash
npm run dev   # runs at http://localhost:5173
```

### 6. Verify

- Frontend: http://localhost:5173 (dev) or http://your-server (prod)
- Backend API: http://localhost:8100/docs
- Health check: http://localhost:8100/health

---

## Manual Installation (Without Docker)

### Backend

```bash
# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your MySQL credentials and model names

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
```

### MySQL

```sql
CREATE DATABASE visualmind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The ORM automatically creates all tables on first startup.

---

## Configuration Reference

All settings are managed via `.env`. See `.env.example` for the template.

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API address |
| `VLM_MODEL` | `qwen2.5vl:7b` | Vision model for document analysis |
| `LLM_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | Chat model |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding model for search |
| `MYSQL_HOST` | `localhost` | MySQL server |
| `MYSQL_PORT` | `3306` | MySQL port |
| `MYSQL_USER` | `root` | MySQL user |
| `MYSQL_PASSWORD` | — | **Required.** MySQL password |
| `MYSQL_DB` | `visualmind` | Database name |
| `MAX_FILE_SIZE_MB` | `20` | Maximum upload size |
| `UPLOAD_DIR` | `uploads` | Uploaded files directory |

---

## Supported Document Types

| Type | Description | Extracted Fields |
|---|---|---|
| **Invoice** | B2B invoices | Company name, date, invoice no, line items, VAT, total |
| **Receipt** | Retail receipts | Store, date, items, subtotal, VAT, payment method |
| **Technical Drawing** | Engineering documents | Title, scale, dimensions, material, notes |
| **General** | Other documents | Title, summary, date, author, keywords |

---

## API Documentation

```
http://your-server:8100/docs      # Swagger UI
http://your-server:8100/redoc     # ReDoc
```

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Upload a document |
| `GET` | `/api/v1/documents` | List all documents |
| `GET` | `/api/v1/documents/{id}` | Get document + extracted data |
| `GET` | `/api/v1/documents/{id}/status` | Query processing status |
| `PATCH` | `/api/v1/documents/{id}` | Rename document |
| `DELETE` | `/api/v1/documents/{id}` | Delete document and all data |
| `POST` | `/api/v1/documents/{id}/ask` | Ask a question about a document |
| `GET` | `/api/v1/documents/{id}/history` | Get chat history |
| `DELETE` | `/api/v1/documents/{id}/history` | Clear chat history |
| `POST` | `/api/v1/search` | Semantic search across documents |

---

## For Enterprise Customers

### Data Privacy

VisualMind is designed for organizations where **data privacy is non-negotiable**:

- **No external API calls** — all AI processing runs on your own hardware via Ollama
- **No telemetry** — no usage data is collected or transmitted
- **No cloud dependency** — fully offline after models are downloaded
- **Documents never leave your servers** — uploaded files and extracted data never exit your own infrastructure

### Scaling

- For high document volume, deploy Ollama on a dedicated GPU server and point `OLLAMA_BASE_URL` to it
- MySQL and ChromaDB can be migrated to managed services (AWS RDS, GCP Cloud SQL, etc.)
- The FastAPI backend is stateless and can be horizontally scaled behind a load balancer

### Backup

Critical data to back up regularly:

```bash
# MySQL (all documents, extractions, chat history)
mysqldump -u root -p visualmind > backup_$(date +%Y%m%d).sql

# ChromaDB (vector embeddings)
tar -czf chroma_backup_$(date +%Y%m%d).tar.gz chroma_data/

# Uploaded files
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

---

## Tech Stack

**Backend:** Python 3.11, FastAPI, SQLAlchemy, ChromaDB, Ollama (httpx)
**Frontend:** React 18, TypeScript, Vite, Axios, react-markdown
**Database:** MySQL 8.0
**Vector DB:** ChromaDB
**AI Models:** Qwen2.5-VL 7B, Qwen2.5 7B, nomic-embed-text (via Ollama)
**Containerization:** Docker, Docker Compose

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
See the [LICENSE](LICENSE) file for details.
