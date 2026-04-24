# 🔄 Implementar Endpoint: POST /api/orders/reject-stale

El CronJob intenta llamar a un endpoint que **no existe actualmente**. Aquí está la implementación completa.

---

## 📋 Resumen

**Propósito:** Rechazar automáticamente todas las órdenes que llevan > 1 hora en estado PENDING o CONFIRMED

**Endpoint:** `POST /api/orders/reject-stale`
**Ejecutado por:** CronJob cada hora
**Lógica:** 
- Buscar órdenes PENDING/CONFIRMED creadas hace > 60 minutos
- Cambiar estado a REJECTED
- Registrar razón: "Auto-rejected by system - Stale order"
- Retornar cantidad de órdenes rechazadas

---

## 🔧 Implementación

### Paso 1: En orders-service/src/controllers/orderController.js

**Agregar nuevo método al final del archivo:**

```javascript
/**
 * Rechazar órdenes antiguas (> 1 hora en estado PENDING/CONFIRMED)
 * POST /api/orders/reject-stale
 */
exports.rejectStaleOrders = async (req, res) => {
  try {
    const logger = require('../utils/logger');
    
    // Calcular timestamp de hace 1 hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    logger.info('Starting stale orders rejection job', {
      thresholdTime: oneHourAgo.toISOString(),
      statuses: ['PENDING', 'CONFIRMED']
    });
    
    // Buscar órdenes antiguas en estados pendientes
    const staleOrders = await Order.findAll({
      where: {
        status: ['PENDING', 'CONFIRMED'],
        createdAt: {
          [Op.lt]: oneHourAgo  // Creadas hace más de 1 hora
        }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'name']
        },
        {
          model: Restaurant,
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    logger.info('Found stale orders', {
      count: staleOrders.length,
      ordersIds: staleOrders.map(o => o.id)
    });
    
    // Si no hay órdenes, retornar
    if (staleOrders.length === 0) {
      logger.info('No stale orders found');
      return res.json({
        success: true,
        rejectedCount: 0,
        message: 'No stale orders to reject'
      });
    }
    
    // Rechazar cada orden
    const rejectionReason = 'Auto-rejected by system - Stale order (pending > 1 hour)';
    const rejectedOrders = [];
    const failedOrders = [];
    
    for (const order of staleOrders) {
      try {
        // Actualizar orden
        await order.update({
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: rejectionReason
        });
        
        // Publicar evento de rechazo a RabbitMQ
        try {
          const { publishOrderRejectedEvent } = require('../services/rabbitmqService');
          await publishOrderRejectedEvent({
            orderId: order.id,
            restaurantId: order.restaurant_id,
            userId: order.user_id,
            reason: rejectionReason,
            timestamp: new Date().toISOString()
          });
        } catch (pubError) {
          logger.error('Failed to publish order rejected event', {
            orderId: order.id,
            error: pubError.message
          });
        }
        
        // Notificar al usuario (opcional)
        try {
          const { notifyOrderRejected } = require('../services/notificationService');
          await notifyOrderRejected(order.user_id, {
            orderId: order.id,
            restaurantId: order.restaurant_id,
            reason: rejectionReason
          });
        } catch (notifyError) {
          logger.warn('Failed to notify user of rejection', {
            userId: order.user_id,
            orderId: order.id,
            error: notifyError.message
          });
        }
        
        rejectedOrders.push({
          id: order.id,
          userId: order.user_id,
          restaurantId: order.restaurant_id,
          originalStatus: order.status,
          newStatus: 'REJECTED'
        });
        
        logger.info('Order rejected successfully', {
          orderId: order.id,
          userId: order.user_id,
          restaurantId: order.restaurant_id,
          reason: rejectionReason
        });
        
      } catch (updateError) {
        logger.error('Failed to reject order', {
          orderId: order.id,
          error: updateError.message,
          stack: updateError.stack
        });
        
        failedOrders.push({
          id: order.id,
          error: updateError.message
        });
      }
    }
    
    // Respuesta
    const response = {
      success: failedOrders.length === 0,
      totalFound: staleOrders.length,
      rejectedCount: rejectedOrders.length,
      failedCount: failedOrders.length,
      timestamp: new Date().toISOString()
    };
    
    if (failedOrders.length > 0) {
      response.failedOrders = failedOrders;
    }
    
    logger.info('Stale orders rejection job completed', response);
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error in rejectStaleOrders job', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to reject stale orders',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
```

---

### Paso 2: En orders-service/src/routes/orders.js

**Agregar la ruta (después de las otras rutas):**

```javascript
// ... otras rutas ...

/**
 * POST /api/orders/reject-stale
 * Rechazar órdenes antiguas (> 1 hora en estado PENDING/CONFIRMED)
 * Ejecutado por CronJob cada hora
 * Sin autenticación requerida (es un job del sistema)
 */
router.post('/reject-stale', orderController.rejectStaleOrders);

// ... resto de rutas ...

module.exports = router;
```

---

### Paso 3: En api-gateway/src/routes/orders.js

**Agregar el proxy al API Gateway:**

```javascript
/**
 * POST /api/orders/reject-stale
 * Proxy a orders-service (requiere estar interno)
 */
router.post('/reject-stale', async (req, res) => {
  try {
    const logger = require('../utils/logger');
    
    logger.info('Proxying reject-stale request', {
      source: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Forward al orders-service
    const response = await axios.post(
      'http://orders-service:3003/api/orders/reject-stale',
      {}
    );
    
    logger.info('Reject-stale request completed', {
      rejectedCount: response.data.rejectedCount,
      success: response.data.success
    });
    
    res.json(response.data);
    
  } catch (error) {
    const logger = require('../utils/logger');
    
    logger.error('Error proxying reject-stale request', {
      error: error.message,
      status: error.response?.status
    });
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to process reject-stale request',
      message: error.message
    });
  }
});
```

---

## 🧪 Probar Manualmente

### 1. Desde curl
```bash
# Prueba directa al orders-service
curl -X POST http://localhost:3003/api/orders/reject-stale

# O a través del API Gateway
curl -X POST http://localhost:3000/api/orders/reject-stale
```

### 2. Verificar respuesta
```json
{
  "success": true,
  "totalFound": 5,
  "rejectedCount": 5,
  "failedCount": 0,
  "timestamp": "2024-04-22T10:30:45.123Z"
}
```

### 3. Verificar en base de datos
```sql
-- Ver órdenes rechazadas en la última hora
SELECT id, status, rejection_reason, rejected_at 
FROM orders 
WHERE status = 'REJECTED' 
AND rejected_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY rejected_at DESC;

-- Ver cuántas órdenes se rechazaron
SELECT COUNT(*) as rejected_count 
FROM orders 
WHERE status = 'REJECTED' 
AND rejected_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

### 4. Ver logs en Kibana
```
kubernetes.labels.app: "orders-service" AND message: "Stale orders rejection"
```

---

## 🐳 Docker: Reconstruir imágenes

Después de hacer cambios en el código, necesitas reconstruir la imagen de orders-service:

```bash
# 1. Build local
docker build -t orders-service:v1.3.1 ./orders-service

# 2. Push a registry (si usas)
docker push gcr.io/proyecto-sa-492706/delivereats/orders-service:v1.3.1

# 3. Update K8s deployment
kubectl set image deployment/orders-service \
  orders-service=gcr.io/proyecto-sa-492706/delivereats/orders-service:v1.3.1 \
  -n delivereats

# 4. Verificar el rollout
kubectl rollout status deployment/orders-service -n delivereats
```

---

## 📊 Estadísticas del Job

**Después de implementar, el CronJob generará:**

```
Cada hora (0 * * * *):
├─ Busca órdenes PENDING/CONFIRMED > 1 hora
├─ Registra cantidad encontrada en logs
├─ Rechaza cada una
├─ Publica evento a RabbitMQ
├─ Notifica al usuario (opcional)
└─ Retorna JSON con estadísticas

Logs en Kibana:
kubernetes.labels.app: "orders-service" AND message: "Starting stale orders rejection"

Ejemplo de resultado en logs:
{
  "totalFound": 12,
  "rejectedCount": 12,
  "failedCount": 0,
  "timestamp": "2024-04-22T11:00:05.123Z"
}
```

---

## 🔍 Debugging

### Si el endpoint no funciona

```bash
# 1. Ver logs del orders-service
kubectl logs -n delivereats -l app=orders-service -f

# 2. Describir pod
kubectl describe pod -n delivereats <orders-service-pod>

# 3. Acceder al pod para debuggear
kubectl exec -it -n delivereats <orders-service-pod> -- bash

# 4. En el pod, verificar conectividad a BD
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME

# 5. Ver órdenes pendientes
SELECT id, status, created_at FROM orders 
WHERE status IN ('PENDING', 'CONFIRMED');
```

---

## ✅ Checklist de Implementación

- [ ] Agregar método `rejectStaleOrders` a orderController.js
- [ ] Agregar ruta POST /reject-stale a orders-service routes
- [ ] Agregar proxy en api-gateway routes
- [ ] Reconstruir imagen de orders-service
- [ ] Push a registry (si usa)
- [ ] Actualizar deployment en K8s
- [ ] Verificar que el CronJob se ejecuta correctamente
- [ ] Ver logs en Kibana
- [ ] Verificar órdenes rechazadas en BD
- [ ] Probar manualmente con curl
- [ ] Configurar alertas si algo falla

---

## 📈 Monitoreo post-implementación

```bash
# Ver ejecuciones del CronJob
kubectl get cronjob -n delivereats reject-stale-orders

# Ver jobs generados
kubectl get jobs -n delivereats -l cronjob=reject-stale-orders

# Ver logs de la última ejecución
kubectl logs -n delivereats -l app=reject-stale-orders --tail=100

# Ver pods que fallaron
kubectl get pods -n delivereats -l cronjob=reject-stale-orders | grep Error

# Ver estadísticas de rechazo por día
# (Ejecutar en la BD)
SELECT DATE(rejected_at) as rejection_date, 
       COUNT(*) as count
FROM orders 
WHERE status = 'REJECTED' 
AND rejection_reason LIKE '%Auto-rejected%'
GROUP BY DATE(rejected_at)
ORDER BY rejection_date DESC;
```

