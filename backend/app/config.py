"""
Backend configuration using Pydantic Settings.
Loads from .env file or environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:8080,http://localhost:5173"

    # ML
    model_cache_dir: str = "./model_cache"
    use_gpu: bool = False
    max_text_length: int = 2048
    max_image_size: int = 10 * 1024 * 1024   # 10MB
    max_video_size: int = 50 * 1024 * 1024    # 50MB

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
