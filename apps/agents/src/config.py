from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    k2think_api_key: str = "mock-key-for-dev"
    k2think_base_url: str = "https://www.k2think.ai/api/chat/completions"
    k2think_model: str = "MBZUAI-IFM/K2-Think-v2"
    semantic_scholar_api_key: str = ""
    database_url: str = "postgresql://holocron:holocron@localhost:5432/holocron"
    storage_path: str = "./storage"
    templates_path: str = "./templates"
    latex_service_url: str = "http://localhost:8081"
    mock_llm: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
if settings.k2think_api_key == "mock-key-for-dev":
    settings.mock_llm = True
