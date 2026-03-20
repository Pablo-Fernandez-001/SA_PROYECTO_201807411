# Documentación Técnica — Flujo de Reembolso (Refund Flow)

## 1. Descripción General

El flujo de reembolso permite a los administradores de DeliverEats procesar devoluciones de dinero para pedidos que han sido entregados, cancelados o que presentaron problemas. El sistema registra la transacción de reembolso, actualiza el estado del pago original y sincroniza el estado de la orden.

## 2. Diagrama de Flujo

```
┌─────────┐    "Reembolsar"    ┌─────────────┐    POST /refund    ┌──────────────────┐
│  Admin   │  ──────────────►  │  Frontend    │  ────────────────► │  API Gateway     │
│  Panel   │                   │  AdminPanel  │                    │  :8080           │
└─────────┘                   └─────────────┘                    └────────┬─────────┘
                                                                          │
                                                                          ▼
┌──────────────┐    Sync Status    ┌──────────────────┐    FX Convert    ┌──────────────┐
│ Orders-Svc   │  ◄──────────────  │ Payment-Service  │  ──────────────► │  FX-Service  │
│ → REEMBOLSADO│                   │ → REEMBOLSADO    │                  │  (rate info) │
└──────────────┘                   └──────────────────┘                  └──────────────┘
```

## 3. Estados del Pedido Involucrados

| Estado | Descripción |
|--------|-------------|
| `CREADA` | Pedido creado, pendiente de pago |
| `PAGADO` | Pago procesado exitosamente |
| `EN_PROCESO` | En preparación en el restaurante |
| `FINALIZADA` | Listo para recoger |
| `EN_CAMINO` | Repartidor en camino |
| `ENTREGADO` | Entrega confirmada con foto |
| `CANCELADO` | Cancelado antes de entrega |
| `RECHAZADA` | Rechazado por el restaurante |
| **`REEMBOLSADO`** | Reembolso procesado por admin |

### Transiciones válidas hacia REEMBOLSADO:
- `PAGADO` → `REEMBOLSADO`
- `ENTREGADO` → `REEMBOLSADO`
- `CANCELADO` → `REEMBOLSADO`
- `RECHAZADA` → `REEMBOLSADO`

## 4. Flujo Detallado

### 4.1 Admin inicia reembolso
1. Admin navega a **Panel Admin → Pedidos**
2. Selecciona un pedido con estado ENTREGADO, CANCELADO, RECHAZADA o PAGADO
3. Hace click en "💰 Reembolsar"
4. Ingresa motivo del reembolso en el modal
5. Confirma la acción

### 4.2 Frontend envía petición
```javascript
POST /api/payments/refund
Authorization: Bearer <token>
{
  "order_id": 15,
  "reason": "Producto defectuoso, cliente solicita devolución"
}
```

### 4.3 Payment-Service procesa
1. Busca el pago original por `order_id`
2. Valida que el pago esté en estado `COMPLETADO`
3. Crea un nuevo registro de pago tipo reembolso:
   - `status: 'REEMBOLSADO'`
   - `refund_reason: <motivo>`
   - `original_payment_id: <id del pago original>`
   - Mismo monto, moneda y tipo de cambio
4. Actualiza el pago original a `status: 'REEMBOLSADO'`
5. Sincroniza con Orders-Service: `PUT /api/orders/{id}/status` → `REEMBOLSADO`

### 4.4 Respuesta exitosa
```json
{
  "success": true,
  "message": "Reembolso procesado exitosamente",
  "data": {
    "refund_id": 10,
    "payment_number": "PAY-1234567890-abc",
    "original_payment_id": 5,
    "amount": 150.00,
    "currency": "GTQ",
    "amount_usd": 19.23,
    "status": "REEMBOLSADO",
    "refund_reason": "Producto defectuoso"
  }
}
```

### 4.5 Socket.IO Notification
El API Gateway emite evento `payment:refund` a todos los clientes conectados para actualización en tiempo real.

## 5. Modelo de Datos

### Tabla `payments` (payment_db)
```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  order_id INT NOT NULL,
  user_id INT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'GTQ',
  amount_usd DECIMAL(10,2),
  exchange_rate DECIMAL(15,8),
  payment_method VARCHAR(50) DEFAULT 'TARJETA',
  card_last_four VARCHAR(4),
  transaction_id VARCHAR(100),
  status ENUM('PENDIENTE','COMPLETADO','FALLIDO','REEMBOLSADO') DEFAULT 'PENDIENTE',
  refund_reason TEXT,
  original_payment_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 6. Seguridad

- Solo usuarios con rol `ADMIN` pueden ejecutar reembolsos
- Validación de JWT en API Gateway antes de proxy
- Se verifica existencia del pago original antes de procesar
- Se registra motivo obligatorio para auditoría

## 7. Manejo de Errores

| Error | Código | Descripción |
|-------|--------|-------------|
| Pago no encontrado | 404 | No existe pago para el order_id dado |
| Pago ya reembolsado | 400 | El pago ya fue procesado como reembolso |
| Sin motivo | 400 | El campo `reason` es obligatorio |
| Error de sincronización | 500 | Fallo al actualizar estado en orders-service (se registra en logs pero el reembolso se procesa) |
