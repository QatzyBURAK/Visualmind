# VisualMind — AI Document Intelligence

> **On-premise, privacy-first document analysis powered by open-source Vision-Language Models.**
> Extract structured data from invoices, receipts, and technical drawings — then chat with your documents using AI. Your data never leaves your servers.

---

## What is VisualMind?

VisualMind is a self-hosted SaaS platform that lets organizations upload business documents (invoices, receipts, technical drawings, generic files) and:

- **Automatically extract** structured data using a Vision-Language Model (VLM)
- **Chat with documents** in natural language via a multi-turn AI assistant
- **Search semantically** across all documents using vector embeddings
- **Rename, filter, and manage** documents from a clean web interface

All AI processing runs locally via [Ollama](https://ollama.com) — no data is sent to external APIs.

---

## Key Features

| Feature | Description |
|---|---|
| VLM Extraction | Qwen2.5-VL automatically reads and structures document content |
| Multi-turn Chat | Ask follow-up questions about any document |
| Semantic Search | Find relevant documents by meaning, not just keywords |
| Format Support | JPG, PNG, WebP, BMP, GIF, TIFF, PDF (auto-converted if needed) |
| On-premise | Runs entirely on your own infrastructure |
| REST API | Full OpenAPI/Swagger documentation at `/docs` |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│         React + TypeScript (Vite)           │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────┐
│           FastAPI Backend (Python)          │
│  • Document upload & management             │
│  • VLM analysis (background task)           │
│  • LLM chat with history                    │
│  • Semantic search (RAG)                    │
└──────┬──────────────┬───────────────┬───────┘
       │              │               │
  ┌────▼────┐   ┌─────▼────┐   ┌─────▼──────┐
  │  MySQL  │   │ ChromaDB │   │   Ollama   │
  │  8.0    │   │ (vectors)│   │  (models)  │
  └─────────┘   └──────────┘   └────────────┘
```

**Models used (via Ollama):**
- `qwen2.5vl:7b` — Vision-Language Model for document analysis
- `qwen2.5:7b-instruct-q4_K_M` — LLM for Q&A chat
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

> **Note:** Without a GPU, Ollama falls back to CPU inference. The 7B VLM model will be very slow on CPU only (5–15 min per document). A dedicated NVIDIA GPU is strongly recommended for production use.

---

## Software Prerequisites

Install the following before proceeding:

| Software | Version | Link |
|---|---|---|
| **Docker** | 24+ | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.20+ | Included with Docker Desktop |
| **Ollama** | Latest | https://ollama.com/download |
| **Node.js** *(frontend only)* | 18+ | https://nodejs.org |
| **Python** *(manual install only)* | 3.11+ | https://python.org |

---

## Quick Start (Docker Compose — Recommended)

This is the recommended deployment method for production.

### 1. Clone the repository

```bash
git clone https://github.com/your-org/visualmind.git
cd visualmind
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# MySQL — change the password
MYSQL_PASSWORD=your_strong_password_here
MYSQL_DB=visualmind

# Models (defaults work out of the box)
VLM_MODEL=qwen2.5vl:7b
LLM_MODEL=qwen2.5:7b-instruct-q4_K_M
EMBED_MODEL=nomic-embed-text
```

### 3. Pull AI models

Ollama must be running and models must be downloaded before starting the stack:

```bash
# Start Ollama (if not already running as a service)
ollama serve

# Pull required models (one-time, ~15 GB total)
ollama pull qwen2.5vl:7b
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull nomic-embed-text
```

> Model downloads may take 10–30 minutes depending on your internet speed.

### 4. Start all services

```bash
docker compose up -d
```

This starts:
- `visualmind_backend` on port **8100**
- `visualmind_mysql` on port **3306**
- `visualmind_chromadb` on port **8001**
- `visualmind_ollama` on port **11434**

### 5. Build and serve the frontend

```bash
cd frontend
npm install
npm run build
```

Serve the `frontend/dist/` folder using Nginx, Caddy, or any static file server:

```nginx
# Example Nginx config
server {
    listen 80;
    root /path/to/visualmind/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api { proxy_pass http://localhost:8100; }
}
```

Or for development/testing:

```bash
npm run dev   # serves at http://localhost:5173
```

### 6. Verify

- Frontend: http://localhost:5173 (dev) or http://your-server (production)
- Backend API: http://localhost:8100/docs
- Health check: http://localhost:8100/health

---

## Manual Installation (Without Docker)

Use this if you cannot use Docker or want more control.

### Backend

```bash
# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your MySQL credentials and model names

# Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
```

### MySQL

```sql
CREATE DATABASE visualmind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The ORM creates all tables automatically on first startup.

### Frontend

```bash
cd frontend
npm install
npm run dev        # development
npm run build      # production build → dist/
```

---

## Configuration Reference

All settings are controlled via `.env`. See `.env.example` for a template.

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `VLM_MODEL` | `qwen2.5vl:7b` | Vision model for document analysis |
| `LLM_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | Chat model |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding model for search |
| `MYSQL_HOST` | `localhost` | MySQL host |
| `MYSQL_PORT` | `3306` | MySQL port |
| `MYSQL_USER` | `root` | MySQL user |
| `MYSQL_PASSWORD` | — | **Required.** MySQL password |
| `MYSQL_DB` | `visualmind` | Database name |
| `MAX_FILE_SIZE_MB` | `20` | Maximum upload file size |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded files |

---

## Supported Document Types

| Type | Description | Example fields extracted |
|---|---|---|
| **Invoice** (Fatura) | B2B invoices | Company name, date, invoice no, line items, VAT, total |
| **Receipt** (Makbuz) | Retail receipts | Store, date, items, subtotal, VAT, payment method |
| **Technical Drawing** | Engineering documents | Title, scale, dimensions, material, notes |
| **Generic** | Any other document | Title, summary, date, author, keywords |

---

## API Documentation

Full interactive API docs are available at:

```
http://your-server:8100/docs      # Swagger UI
http://your-server:8100/redoc     # ReDoc
```

### Key endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/documents/upload` | Upload a document |
| `GET` | `/api/v1/documents` | List all documents |
| `GET` | `/api/v1/documents/{id}` | Get document + extracted data |
| `GET` | `/api/v1/documents/{id}/status` | Poll processing status |
| `PATCH` | `/api/v1/documents/{id}` | Rename a document |
| `DELETE` | `/api/v1/documents/{id}` | Delete document and all data |
| `POST` | `/api/v1/documents/{id}/ask` | Ask a question about a document |
| `GET` | `/api/v1/documents/{id}/history` | Get chat history |
| `DELETE` | `/api/v1/documents/{id}/history` | Clear chat history |
| `POST` | `/api/v1/search` | Semantic search across documents |

---

## For Corporate Customers

### Data Privacy

VisualMind is designed from the ground up for organizations where **data confidentiality is non-negotiable**:

- **No external API calls** — all AI inference runs on your own hardware via Ollama
- **No telemetry** — no usage data is collected or transmitted
- **No cloud dependency** — works fully offline after initial model download
- **Your documents stay on your servers** — uploaded files and extracted data never leave your infrastructure

### Multi-tenant Deployment

For organizations with multiple departments:

1. Deploy separate instances per department (recommended for strict isolation)
2. Or use a single instance with network-level access control

### Scaling

- For high document volume, deploy Ollama on a dedicated GPU server and point `OLLAMA_BASE_URL` to it
- MySQL and ChromaDB can be moved to managed services (AWS RDS, GCP Cloud SQL, etc.)
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

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
