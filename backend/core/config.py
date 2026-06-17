# Configurations for the knova-backend

from functools import lru_cache
from pydantic_settings import BaseSettings

setting = None

class Settings(BaseSettings):
    DEBUG: bool = True
    
    
@lru_cache
def get_settings():
    return Settings()