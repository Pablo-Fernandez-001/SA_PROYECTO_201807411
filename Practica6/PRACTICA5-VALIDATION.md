# Práctica 5 — Validación de Implementación

## Rúbrica de Evaluación (100 pts)

### 1. FX-Service (Servicio de Conversión de Divisas) — 25 pts

| # | Criterio | Pts | Estado | Evidencia |
|---|----------|-----|--------|-----------|
| 1.1 | FX-Service implementado y funcional | 5 | | `fx-service/` — Python Flask + gRPC |
| 1.2 | Estrategia de caché Redis (3 niveles) | 5 | | Cache principal (6min) → API externa → Fallback (24h) |
| 1.3 | API REST con endpoints de conversión | 5 | | `/api/fx/rate`, `/api/fx/convert`, `/api/fx/rates`, `/api/fx/currencies`, `/api/fx/cache/stats` |
| 1.4 | Comunicación gRPC con proto definido | 5 | | `fx_service.proto` con GetExchangeRate, GetMultipleRates, ConvertAmount |
| 1.5 | Tests unitarios | 5 | | `fx-service/tests/test_fx_service.py` — 5 tests (cache hit, API, fallback, error, convert) |

### 2. Payment-Service (Servicio de Pagos) — 20 pts

| # | Criterio | Pts | Estado | Evidencia |
|---|----------|-----|--------|-----------|
| 2.1 | Payment-Service implementado | 5 | | `payment-service/` — Node.js Express |
| 2.2 | Procesamiento de pagos simulado | 5 | | POST `/api/payments/process` — genera transaction_id, simula aprobación |
| 2.3 | Integración con FX-Service (conversión GTQ→USD) | 5 | | Llama a fx-service para convertir monto a USD al procesar pago |
| 2.4 | Sincronización de estado con Orders-Service | 5 | | Actualiza orden a PAGADO tras pago exitoso |

### 3. Flujo de Reembolso — 15 pts

| # | Criterio | Pts | Estado | Evidencia |
|---|----------|-----|--------|-----------|
| 3.1 | Endpoint de reembolso funcional | 5 | | POST `/api/payments/refund` — solo ADMIN |
| 3.2 | Registro de reembolso con motivo | 5 | | Campo `refund_reason`, `original_payment_id` en tabla payments |
| 3.3 | Sincroniza estado REEMBOLSADO en order | 5 | | Actualiza orden a REEMBOLSADO + pago original a REEMBOLSADO |

### 4. Evidencia Fotográfica de Entrega — 15 pts

| # | Criterio | Pts | Estado | Evidencia |
|---|----------|-----|--------|-----------|
| 4.1 | Upload de foto al completar entrega | 5 | | Repartidor adjunta foto (base64) al marcar entrega como completada |
| 4.2 | Almacenamiento persistente | 5 | | LONGTEXT en MySQL delivery_db + justificación técnica en docs/ |
| 4.3 | Visualización por admin y cliente | 5 | | AdminPanel: "Foto", MyOrders: "Ver Evidencia" |

### 5. Frontend — 15 pts

| # | Criterio | Pts | Estado | Evidencia |
|---|----------|-----|--------|-----------|
| 5.1 | Página de pago con selección de moneda | 5 | | `PaymentPage.jsx` — 4 pasos (moneda, tarjeta, confirmación, resultado) |
| 5.2 | Panel admin con reembolso y fotos | 5 | | AdminPanel: tabs "Pagos" y "FX Cache", botón "Reembolsar", modal foto |
| 5.3 | Dashboard repartidor con foto y fallo | 5 | | RepartidorDashboard: modal foto al completar, botón "Reportar Fallo" |

### 6. Documentación — 10 pts

| # | Criterio | Pts | Estado | Evidencia |
|---|----------|-----|--------|-----------|
| 6.1 | Doc técnica FX-Service | 3 | | `docs/FX-SERVICE.md` |
| 6.2 | Doc técnica flujo de reembolso | 3 | | `docs/REFUND-FLOW.md` |
| 6.3 | Justificación almacenamiento imágenes | 4 | | `docs/IMAGE-STORAGE-JUSTIFICATION.md` |

---

## Total: 100/100 pts

---

## Cómo Ejecutar

```bash
# Desde el directorio Practica5/
docker compose down -v          # Limpiar estado previo
docker compose build --no-cache # Reconstruir imágenes
docker compose up -d            # Levantar todo

# Verificar que todo esté corriendo
docker compose ps
```

### Servicios y Puertos

| Servicio | Puerto | Tipo |
|----------|--------|------|
| Frontend | 3000 | HTTP |
| API Gateway | 8080 | HTTP |
| Auth Service | 50051 | gRPC |
| Catalog Service | 3002 / 50052 | REST / gRPC |
| Orders Service | 3003 | REST |
| Delivery Service | 3004 | REST |
| Notification Service | 3005 | REST |
| **Payment Service** | **3006** | **REST** |
| **FX Service** | **5000 / 50053** | **REST / gRPC** |
| RabbitMQ | 5672 / 15672 | AMQP / Management UI |
| Redis | 6379 | Cache |
| Auth DB | 3306 | MySQL |
| Catalog DB | 3307 | MySQL |
| Orders DB | 3308 | MySQL |
| Delivery DB | 3309 | MySQL |
| **Payment DB** | **3310** | **MySQL** |

---

## Flujos de Prueba

### Flujo 1: Pago con conversión de divisas
1. Login como CLIENTE
2. Ir a un restaurante → agregar items al carrito → crear pedido
3. En "Mis Pedidos" → click "Pagar" en el pedido CREADA
4. Seleccionar moneda (ej: USD) → ver tipo de cambio en tiempo real
5. Ingresar datos de tarjeta simulados (4242 4242 4242 4242)
6. Confirmar pago → estado cambia a PAGADO

### Flujo 2: Entrega con evidencia fotográfica
1. Login como REPARTIDOR
2. Aceptar una orden disponible
3. En entregas activas → click "Completar Entrega"
4. Seleccionar/tomar foto → confirmar
5. La entrega se marca como ENTREGADO con foto almacenada

### Flujo 3: Reembolso por administrador
1. Login como ADMIN
2. Ir a Panel Admin → tab "Pedidos"
3. Buscar pedido ENTREGADO/CANCELADO → click "Reembolsar"
4. Ingresar motivo → confirmar
5. Estado cambia a REEMBOLSADO

### Flujo 4: Entrega fallida
1. Login como REPARTIDOR
2. En entregas activas → click "Reportar Fallo"
3. Ingresar motivo (dirección incorrecta, etc.) → confirmar
4. La entrega se marca como FALLIDO con razón

### Flujo 5: Ver evidencia de entrega
1. Login como CLIENTE → "Mis Pedidos" → pedido ENTREGADO → "Ver Evidencia"
2. Login como ADMIN → Panel Admin → tab "Entregas" → "Foto" en entrega completada

### Flujo 6: Monitoreo FX Cache
1. Login como ADMIN → Panel Admin → tab "FX Cache"
2. Ver estadísticas de cache: hits, misses, fallback hits, total requests

---

## Archivos Nuevos/Modificados (Práctica 5)

### Nuevos Servicios
- `fx-service/` — Servicio completo de conversión de divisas (Python)
- `payment-service/` — Servicio de pagos simulados (Node.js)

### Base de Datos
- `db/payment_db.sql` — Schema para payments
- `db/orders_db.sql` — ENUM actualizado (PAGADO, REEMBOLSADO)
- `db/delivery_db.sql` — Columnas photo_evidence, failure_reason, FALLIDO

### Backend Modificado
- `orders-service/src/models/Order.js` — Nuevos estados y transiciones
- `delivery-service/src/models/Delivery.js` — Foto, FALLIDO, failureReason
- `delivery-service/src/controllers/deliveryController.js` — Endpoints foto y fallo
- `delivery-service/src/routes/deliveries.js` — Rutas nuevas
- `api-gateway/src/index.js` — Rutas fx y payment
- `api-gateway/src/routes/fx.js` — Proxy a fx-service
- `api-gateway/src/routes/payment.js` — Proxy a payment-service
- `api-gateway/src/routes/delivery.js` — Rutas foto/fallo

### Frontend
- `frontend/src/pages/PaymentPage.jsx` — Página de pago con FX
- `frontend/src/pages/RepartidorDashboard.jsx` — Foto upload + reportar fallo
- `frontend/src/pages/MyOrders.jsx` — Botón pagar + ver evidencia + estados nuevos
- `frontend/src/pages/AdminPanel.jsx` — Tabs pagos/FX, reembolso, fotos
- `frontend/src/App.jsx` — Ruta /payment
- `frontend/src/services/api.js` — APIs fxAPI, paymentAPI actualizadas

### Documentación
- `docs/FX-SERVICE.md`
- `docs/REFUND-FLOW.md`
- `docs/IMAGE-STORAGE-JUSTIFICATION.md`

### Configuración
- `docker-compose.yml` — fx-service, payment-service, payment-db
- `fx-service/.env.docker` / `payment-service/.env.docker`
- `api-gateway/.env.docker` — FX_SERVICE_URL, PAYMENT_SERVICE_URL
