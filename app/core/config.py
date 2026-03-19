from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    VLM_MODEL: str = "qwen2.5vl:7b"
    LLM_MODEL: str = "qwen2.5:7b-instruct-q4_K_M"
    EMBED_MODEL: str = "nomic-embed-text"

    # MySQL
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "password"
    MYSQL_DB: str = "visualmind"

    @property
    def MYSQL_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "visualmind_docs"

    # App
    UPLOAD_DIR: str = "uploads"
    LOG_DIR: str = "logs"
    MAX_FILE_SIZE_MB: int = 20

    class Config:
        env_file = ".env"


settings = Settings()
