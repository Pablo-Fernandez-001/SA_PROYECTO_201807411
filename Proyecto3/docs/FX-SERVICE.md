# Documentación Técnica — FX-Service (Servicio de Conversión de Divisas)

## 1. Descripción General

El **FX-Service** es un microservicio construido en **Python 3.11** con **Flask** (API REST) y **gRPC** que proporciona conversión de divisas en tiempo real para la plataforma DeliverEats. Implementa una **estrategia de caché multinivel** con Redis para garantizar alta disponibilidad y rendimiento.

## 2. Arquitectura

```
┌─────────────┐     REST/gRPC     ┌─────────────┐     Redis Cache     ┌────────────┐
│  API Gateway│ ──────────────►  │  FX-Service │ ◄──────────────►   │   Redis    │
│  :8080      │                   │  :5000/:50053│                    │   :6379    │
└─────────────┘                   └──────┬───────┘                    └────────────┘
                                         │
                                         │ HTTP (Fallback)
                                         ▼
                                  ┌─────────────┐
                                  │ ExchangeRate │
                                  │  API (ext)   │
                                  └─────────────┘
```

## 3. Estrategia de Cache (3 niveles)

### Nivel 1: Cache Principal (TTL: 6 minutos)
- Al solicitar un tipo de cambio, primero se consulta Redis con clave `fx:rate:{base}:{target}`.
- Si existe y no ha expirado, se retorna inmediatamente (**Cache Hit**).
- TTL configurable via `CACHE_TTL` (default: 360 segundos = 6 min).

### Nivel 2: API Externa
- Si no hay cache, se consulta `https://open.er-api.com/v6/latest/{base}`.
- Los resultados se almacenan en Redis (cache principal) para futuras consultas.
- Todas las tasas de la respuesta se almacenan simultáneamente para optimizar futuras consultas.

### Nivel 3: Fallback (TTL: 24 horas)
- Al recibir respuesta de la API, cada tasa se guarda también con clave `fx:fallback:{base}:{target}` y TTL de 24 horas.
- Si la API no responde, se usa el valor fallback más reciente.
- Garantiza disponibilidad incluso cuando la API externa está caída.

```
Solicitud → ¿Cache principal? → SÍ → Retornar (Cache Hit)
                    ↓ NO
            ¿API externa OK? → SÍ → Guardar en cache + fallback → Retornar
                    ↓ NO
            ¿Fallback existe? → SÍ → Retornar (Fallback Hit)
                    ↓ NO
               Error 503 (No disponible)
```

## 4. Endpoints REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check del servicio |
| GET | `/api/fx/rate?base=USD&target=GTQ` | Obtener tipo de cambio |
| GET | `/api/fx/rates?base=USD&targets=GTQ,EUR,MXN` | Múltiples tasas |
| POST | `/api/fx/convert` | Convertir monto entre monedas |
| GET | `/api/fx/currencies` | Listar monedas soportadas |
| GET | `/api/fx/cache/stats` | Estadísticas del cache |

### Ejemplo: Conversión
```json
POST /api/fx/convert
{
  "amount": 100.00,
  "from_currency": "GTQ",
  "to_currency": "USD"
}

Respuesta:
{
  "success": true,
  "data": {
    "original_amount": 100.00,
    "from_currency": "GTQ",
    "to_currency": "USD",
    "exchange_rate": 0.1282,
    "converted_amount": 12.82,
    "source": "cache"
  }
}
```

## 5. Servicio gRPC

El FX-Service expone un servidor gRPC en el puerto **50053** con los siguientes métodos RPC:

```protobuf
service FXService {
  rpc GetExchangeRate (ExchangeRateRequest) returns (ExchangeRateResponse);
  rpc GetMultipleRates (MultipleRatesRequest) returns (MultipleRatesResponse);
  rpc ConvertAmount (ConvertRequest) returns (ConvertResponse);
}
```

El proto se encuentra en `fx-service/app/protos/fx_service.proto`.

## 6. Configuración

| Variable | Descripción | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Host de Redis | `localhost` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `GRPC_PORT` | Puerto gRPC | `50053` |
| `FLASK_PORT` | Puerto REST | `5000` |
| `FX_API_BASE_URL` | URL de la API externa | `https://open.er-api.com/v6/latest` |
| `CACHE_TTL` | TTL del cache principal (seg) | `360` |
| `FALLBACK_TTL` | TTL del fallback (seg) | `86400` |

## 7. Tests

Ejecutar tests unitarios:
```bash
cd fx-service
pip install -r requirements.txt
python -m pytest tests/ -v
```

Los tests cubren: cache hit, API success, fallback, conversión, y manejo de errores.

## 8. Docker

```bash
docker compose build fx-service
docker compose up fx-service
```

Dependencias: `redis` (service_healthy)
