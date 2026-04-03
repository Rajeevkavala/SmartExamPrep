from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = Field(default="HS256")
    GEMINI_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def jwt_secret(self) -> str:
        return self.JWT_SECRET

    @property
    def jwt_algorithm(self) -> str:
        return self.JWT_ALGORITHM

    @property
    def gemini_api_key(self) -> str:
        return self.GEMINI_API_KEY

    @property
    def upload_dir(self) -> str:
        return self.UPLOAD_DIR


settings = Settings()
