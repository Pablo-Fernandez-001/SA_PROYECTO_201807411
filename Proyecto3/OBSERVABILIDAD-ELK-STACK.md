# 📊 Stack ELK - Observabilidad Completa en DeliverEats

## 📑 Índice
1. [¿Qué es el Stack ELK?](#qué-es-el-stack-elk)
2. [Arquitectura Implementada](#arquitectura-implementada)
3. [Cómo Funciona Paso a Paso](#cómo-funciona-paso-a-paso)
4. [Implementación en Microservicios](#implementación-en-microservicios)
5. [Acceder a Kibana](#acceder-a-kibana)
6. [Dashboards Disponibles](#dashboards-disponibles)
7. [Consultas Útiles](#consultas-útiles)
8. [Troubleshooting](#troubleshooting)

---

## ¿Qué es el Stack ELK?

**ELK = Elasticsearch + Logstash/Fluent Bit + Kibana**

| Componente | Función |
|-----------|---------|
| **E**lasticsearch | Base de datos NoSQL para almacenar y buscar logs |
| **L**ogstash/Fluent Bit | Recolecta, procesa y envía logs |
| **K**ibana | Interfaz web para visualizar y analizar logs |

---

## 🏗️ Arquitectura Implementada

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Proyecto3 - DeliverEats                            │
└──────────────────────────────────────────────────────────────────────────┘

NIVEL 1: GENERACIÓN DE LOGS (Microservicios)
═══════════════════════════════════════════════════════════════════════════

  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │  API Gateway     │   │  Orders Service  │   │  Auth Service    │
  │  (puerto 3000)   │   │  (puerto 3003)   │   │  (puerto 50051)  │
  ├──────────────────┤   ├──────────────────┤   ├──────────────────┤
  │ Logger: Winston  │   │ Logger: Winston  │   │ Logger: Winston  │
  │ Formato: JSON    │   │ Formato: JSON    │   │ Formato: JSON    │
  │ Service: api-gw  │   │ Service: orders  │   │ Service: auth    │
  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
           │                      │                      │
           └──────────────────────┼──────────────────────┘
                                  │
                        ↓ Escribe a stdout/stderr
                        ↓ Kubernetes captura en
                        ↓ /var/log/containers/*.log
                                  ↓

NIVEL 2: RECOLECCIÓN DE LOGS (Fluent Bit en K8s)
═══════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Fluent Bit (DaemonSet - Corre en cada nodo)                   │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  INPUT STAGE:                                                   │
  │  ┌─────────────────────────────────────────┐                   │
  │  │ Tail Input Plugin                        │                   │
  │  │ Path: /var/log/containers/*.log         │                   │
  │  │ Parser: cri (Kubernetes format)         │                   │
  │  │ Mem_Buf_Limit: 50MB                     │                   │
  │  └─────────────────────────────────────────┘                   │
  │              ↓                                                   │
  │  FILTER STAGE:                                                  │
  │  ┌─────────────────────────────────────────┐                   │
  │  │ Kubernetes Filter Plugin                │                   │
  │  │ Enriquece logs con:                     │                   │
  │  │  - Namespace: delivereats               │                   │
  │  │  - Pod name: orders-service-xyz-abc     │                   │
  │  │  - Container name: orders-service       │                   │
  │  │  - Labels: app, version, etc            │                   │
  │  │  - Annotations                          │                   │
  │  └─────────────────────────────────────────┘                   │
  │              ↓                                                   │
  │  OUTPUT STAGE:                                                  │
  │  ┌─────────────────────────────────────────┐                   │
  │  │ Elasticsearch Output Plugin              │                   │
  │  │ Host: elasticsearch:9200                │                   │
  │  │ Index: delivereats-logs                 │                   │
  │  │ Logstash_Format: true (índices diarios) │                   │
  │  │ Retry_Limit: Reintentos infinitos       │                   │
  │  └─────────────────────────────────────────┘                   │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
                                  ↓

NIVEL 3: ALMACENAMIENTO (Elasticsearch)
═══════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Elasticsearch 8.14.1 (Single-node cluster)                    │
  ├─────────────────────────────────────────────────────────────────┤
  │  Puerto: 9200                                                   │
  │  Recursos: 512Mi min → 2Gi max RAM                              │
  │                                                                 │
  │  Índices:                                                       │
  │  ├─ delivereats-logs-2024.04.22               (índice diario)   │
  │  ├─ delivereats-logs-2024.04.21               (anterior)        │
  │  └─ delivereats-logs-2024.04.20               (histórico)       │
  │                                                                 │
  │  Documentos JSON indexados:                                     │
  │  {                                                              │
  │    "@timestamp": "2024-04-22T10:30:45.123Z",                   │
  │    "log": "{\"timestamp\":..., \"level\":\"info\", ...}",      │
  │    "kubernetes": {                                              │
  │      "pod_name": "orders-service-xyz-abc",                      │
  │      "namespace": "delivereats",                                │
  │      "container_name": "orders-service",                        │
  │      "labels": {"app": "orders-service"}                        │
  │    },                                                           │
  │    "service": "orders-service",                                 │
  │    "level": "info",                                             │
  │    "message": "Order created successfully"                      │
  │  }                                                              │
  │                                                                 │
  │  Total documentos: Millones (dependiendo del volumen)           │
  │  Almacenamiento: Comprimido automáticamente                     │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
                                  ↓

NIVEL 4: VISUALIZACIÓN (Kibana)
═══════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Kibana 8.14.1 (Interfaz Web)                                  │
  ├─────────────────────────────────────────────────────────────────┤
  │  Puerto: 5601                                                   │
  │                                                                 │
  │  ✅ Discover:           Buscar y filtrar logs                   │
  │  ✅ Dashboards:         3 dashboards pre-configurados:          │
  │     - errors-by-service                                        │
  │     - response-time-trend                                      │
  │     - delivereats-phase3                                       │
  │  ✅ Visualizations:     Gráficos, tablas, mapas                │
  │  ⚠️  Alerting:          (No configurado)                        │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Cómo Funciona Paso a Paso

### Ejemplo Real: Crear una Orden

**Paso 1: Microservicio emite log**
```javascript
// orders-service/src/controllers/orderController.js

async function createOrder(req, res) {
  try {
    const order = await Order.create(orderData);
    
    logger.info('Order created successfully', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      userId: req.user.id,
      totalAmount: order.total_amount,
      timestamp: new Date().toISOString()
    });
    
    res.json(order);
  } catch (error) {
    logger.error('Failed to create order', {
      error: error.message,
      userId: req.user.id,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
}
```

**Paso 2: Winston escribe a stdout (en JSON)**
```
{"timestamp":"2024-04-22T10:30:45.123Z","level":"info","message":"Order created successfully","service":"orders-service","orderId":12345,"restaurantId":567,"userId":789,"totalAmount":150.50}
```

**Paso 3: Kubernetes captura el log**
```
/var/log/containers/orders-service-xyz-abc_delivereats_orders-service-container-id.log

CRI format:
2024-04-22T10:30:45.123456Z stdout F {"timestamp":"2024-04-22T10:30:45.123Z",...}
```

**Paso 4: Fluent Bit recolecta y enriquece**
```
Fluent Bit lee cada línea y:
1. Parsea el JSON original
2. Agrega metadata de Kubernetes:
   - namespace: delivereats
   - pod_name: orders-service-xyz-abc
   - container_name: orders-service
   - labels: {"app": "orders-service"}
3. Crea documento enriquecido
```

**Paso 5: Envía a Elasticsearch**
```json
{
  "@timestamp": "2024-04-22T10:30:45.123Z",
  "log": "{\"timestamp\":\"2024-04-22T10:30:45.123Z\",...}",
  "kubernetes": {
    "pod_name": "orders-service-xyz-abc",
    "namespace": "delivereats",
    "pod_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "container_name": "orders-service",
    "labels": {
      "app": "orders-service",
      "pod-template-hash": "xyz"
    }
  },
  "service": "orders-service",
  "level": "info",
  "message": "Order created successfully",
  "orderId": 12345,
  "restaurantId": 567,
  "userId": 789,
  "totalAmount": 150.50
}
```

**Paso 6: En Kibana, buscas y encuentras**
```
Kibana Query:
service: "orders-service" AND message: "Order created"

Resultado:
✓ Aparece el log con todos los detalles
✓ Puedes ver timestamp exacto
✓ Filtrar por orderId, userId, etc.
✓ Correlacionar con otros logs
```

---

## 🔧 Implementación en Microservicios

### Logger configurado en 5 servicios ✅

| Servicio | Ubicación | Formato | Estado |
|----------|-----------|---------|--------|
| api-gateway | `src/utils/logger.js` | JSON ✅ | ✅ |
| auth-service | `src/utils/logger.js` | JSON ✅ | ✅ |
| catalog-service | `src/utils/logger.js` | JSON ✅ | ✅ |
| orders-service | `src/utils/logger.js` | JSON ✅ | ✅ |
| delivery-service | `src/utils/logger.js` | JSON ✅ | ✅ |
| payment-service | `src/utils/logger.js` | Console ⚠️ | Migrar |
| notification-service | `src/utils/logger.js` | Console ⚠️ | Migrar |

### Ejemplo: orders-service logger

**Archivo: `orders-service/src/utils/logger.js`**
```javascript
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),           // Agrega timestamp
    winston.format.errors({ stack: true }), // Captura stack traces
    winston.format.json()                 // JSON format
  ),
  defaultMeta: { 
    service: 'orders-service',            // Identifica el servicio
    version: process.env.npm_package_version
  },
  transports: [
    // Error logs a archivo
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Todos los logs a archivo
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// En producción, también a console para Kubernetes
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Uso en Controladores

**Archivo: `orders-service/src/controllers/orderController.js`**
```javascript
const logger = require('../utils/logger');

exports.createOrder = async (req, res) => {
  try {
    const { restaurant_id, items, user_id } = req.body;
    
    logger.info('Creating order', {
      restaurantId: restaurant_id,
      itemsCount: items.length,
      userId: user_id
    });
    
    // Validar con gRPC
    const validationResult = await validateWithCatalog(...);
    
    logger.debug('Catalog validation completed', {
      valid: validationResult.valid,
      itemsValidated: validationResult.item_results.length
    });
    
    // Crear orden
    const order = await Order.create({
      restaurant_id,
      user_id,
      total_amount: validationResult.total_calculated,
      status: 'PENDING'
    });
    
    logger.info('Order created successfully', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      userId: user_id,
      totalAmount: order.total_amount
    });
    
    // Publicar evento a RabbitMQ
    await publishOrderCreatedEvent(order);
    
    res.json(order);
    
  } catch (error) {
    logger.error('Failed to create order', {
      error: error.message,
      userId: req.body.user_id,
      restaurantId: req.body.restaurant_id,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
};
```

---

## 🎯 Acceder a Kibana

### 1. Port-forward local
```powershell
kubectl port-forward -n delivereats svc/kibana 5601:5601
```

### 2. Abrir en navegador
```
http://localhost:5601
```

### 3. Crear Index Pattern (primera vez)
```
Stack Management → Index Patterns → Create Index Pattern
Name: delivereats-logs*
Timestamp: @timestamp
```

### 4. Ir a Discover
```
Discover → Selecciona "delivereats-logs*"
Verás todos los logs en tiempo real
```

---

## 📊 Dashboards Disponibles

### Dashboard 1: Errors by Service
```
¿Qué muestra?
- Gráfico de barras con errores por microservicio
- X-axis: Microservicios (auth, orders, catalog, etc)
- Y-axis: Cantidad de errores
- Filtrable por rango de tiempo
```

### Dashboard 2: Response Time Trend
```
¿Qué muestra?
- Gráfico de línea con tiempo promedio de respuesta
- X-axis: Tiempo
- Y-axis: Milisegundos promedio
- Tendencia a lo largo del día
```

### Dashboard 3: DeliverEats Phase 3
```
¿Qué muestra?
- Combinación de varias visualizaciones
- Total de logs por servicio
- Distribución de niveles (info, error, debug)
- Últimos 100 logs con detalles
```

---

## 🔍 Consultas Útiles en Kibana

### 1. Ver todos los logs de orders-service
```
kubernetes.labels.app: "orders-service"
```

### 2. Ver solo errores
```
level: "error"
```

### 3. Errores de orders-service
```
kubernetes.labels.app: "orders-service" AND level: "error"
```

### 4. Logs de creación de orden (últimas 24 horas)
```
message: "Order created" AND @timestamp: [now-24h TO now]
```

### 5. Logs por usuario específico
```
userId: 789
```

### 6. Logs de un restaurante específico
```
restaurantId: 567 AND kubernetes.labels.app: "orders-service"
```

### 7. Ver performance de endpoints
```
message: "Order created" OR message: "Order rejected" OR message: "Order confirmed"
```

### 8. Últimos errores críticos
```
level: "error" OR level: "fatal" AND kubernetes.namespace: "delivereats"
```

---

## 🆘 Troubleshooting

### Problema: "No veo logs en Kibana"

**1. Verificar que Elasticsearch está corriendo:**
```powershell
kubectl get pods -n delivereats -l app=elasticsearch
```

**2. Verificar que Fluent Bit está recolectando:**
```powershell
kubectl logs -n delivereats -l app=fluent-bit --tail=50
```

**3. Verificar índices en Elasticsearch:**
```powershell
kubectl exec -n delivereats <elasticsearch-pod> -- \
  curl -s http://localhost:9200/_cat/indices
```

### Problema: "Kibana no conecta con Elasticsearch"

```powershell
# Ver logs de Kibana
kubectl logs -n delivereats -l app=kibana

# Verificar DNS desde Kibana
kubectl exec -n delivereats <kibana-pod> -- \
  nslookup elasticsearch.delivereats.svc.cluster.local
```

### Problema: "Los logs son muy antiguos"

**Razón:** Los índices se crean por día (delivereats-logs-2024.04.22)

**Solución:** Asegúrate que Fluent Bit está corriendo y enviando:
```powershell
kubectl logs -n delivereats -l app=fluent-bit -f
```

### Problema: "Demasiados documentos, Elasticsearch lento"

**Solución:** Implementar índices con retención automática
```
(Requiere advanced configuration)
```

---

## 📈 Estadísticas

| Métrica | Valor |
|---------|-------|
| **Pods enviando logs** | 7 microservicios |
| **Fluent Bit pods** | N (uno por nodo) |
| **Almacenamiento (7 días)** | ~50GB (depende del volumen) |
| **Documentos/segundo** | ~1000-5000 (promedio) |
| **Retención histórica** | Configurable (ahora: indefinida) |
| **Dashboards** | 3 pre-configurados |

---

## ✅ Checklist ELK

- [x] Elasticsearch desplegado y corriendo
- [x] Kibana desplegado y accesible
- [x] Fluent Bit recolectando logs
- [x] Winston logger en microservicios (5/7 con JSON)
- [x] Índices creándose automáticamente
- [x] Dashboards de ejemplo disponibles
- [ ] Alertas configuradas
- [ ] Persistencia de datos
- [ ] Seguridad (autenticación/autorización)
- [ ] Backups de índices

---

## 🚀 Próximos Pasos

1. **Mejorar logging:** Migrar payment-service y notification-service a JSON
2. **Agregar alertas:** Configurar AlertManager
3. **Persistencia:** Agregar PersistentVolumeClaim a Elasticsearch
4. **Seguridad:** Habilitar autenticación en Elasticsearch y Kibana
5. **Dashboards:** Crear dashboards más detallados por servicio
6. **Runbooks:** Documentar acciones ante alertas

