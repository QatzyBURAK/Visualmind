"""
Faz 5 — FastAPI Uygulama Girişi
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.models.database import create_tables

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

os.makedirs(settings.LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"{settings.LOG_DIR}/visualmind.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VisualMind başlatılıyor...")
    create_tables()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("Tablolar hazır, upload dizini kontrol edildi.")
    yield
    logger.info("VisualMind kapatılıyor.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="VisualMind",
    description="Multimodal Document Intelligence System — Qwen2-VL + Qwen2.5 + RAG",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "app": "VisualMind", "docs": "/docs"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}
