import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Externa de Exchange Rate
    FX_API_BASE_URL = os.getenv('FX_API_BASE_URL', 'https://open.er-api.com/v6/latest')
    FX_API_TIMEOUT = int(os.getenv('FX_API_TIMEOUT', '10'))
    
    # Redis Configuration
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
    REDIS_DB = int(os.getenv('REDIS_DB', '0'))
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '') or None
    
    # Cache TTL (Time To Live) en segundos
    CACHE_TTL = int(os.getenv('CACHE_TTL', '360'))        # 6 minutos
    FALLBACK_TTL = int(os.getenv('FALLBACK_TTL', '86400'))  # 24 horas
    
    # gRPC Configuration
    GRPC_PORT = os.getenv('GRPC_PORT', '50053')
    GRPC_MAX_WORKERS = int(os.getenv('GRPC_MAX_WORKERS', '10'))
    
    # Flask Configuration (Health check + REST API)
    FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.getenv('FLASK_PORT', '5000'))
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
