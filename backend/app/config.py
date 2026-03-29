"""Application configuration."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App configuration loaded from environment or defaults."""

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_MODEL: str = "qwen3.5:9b"

    # Database
    DB_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "aetheris.db",
    )

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Chat
    MAX_CONTEXT_MESSAGES: int = 40

    @property
    def db_url(self) -> str:
        return f"sqlite:///{self.DB_PATH}"

    class Config:
        env_file = ".env"


settings = Settings()
