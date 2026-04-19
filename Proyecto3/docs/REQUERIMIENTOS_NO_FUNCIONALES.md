# Requerimientos No Funcionales - DeliverEats Fase 2
## Versión 1.1.0 - Actualizado para Práctica 4

---

## 1. Rendimiento

### RNF-01: Tiempo de Respuesta de APIs
**Prioridad:** Alta  
**Descripción:** El sistema debe responder a las peticiones HTTP en tiempos aceptables para garantizar buena experiencia de usuario.

**Criterios de Aceptación:**
- **Operaciones de lectura (GET):** Máximo 500ms en el percentil 95
- **Operaciones de escritura (POST/PUT/DELETE):** Máximo 1 segundo en el percentil 95
- **Autenticación (Login):** Máximo 800ms en el percentil 95
- **Operaciones con mensajería asíncrona:** Máximo 200ms para publicación

**Medición:**
- Utilizar herramientas de monitoreo (Prometheus + Grafana)
- Implementar logs de tiempo de respuesta en cada microservicio
- Ejecutar pruebas de carga con Apache JMeter o K6

---

### RNF-02: Throughput
**Prioridad:** Media  
**Descripción:** El sistema debe soportar un número razonable de peticiones concurrentes sin degradación significativa.

**Criterios de Aceptación:**
- **API Gateway:** Mínimo 1000 peticiones por segundo (RPS)
- **Auth Service:** Mínimo 500 autenticaciones por segundo
- **Order Service:** Mínimo 200 órdenes por segundo
- **Catalog Service:** Mínimo 800 consultas por segundo

**Estrategias:**
- Implementar caché Redis para consultas frecuentes (restaurantes, menús)
- Utilizar connection pooling en bases de datos
- Escalado horizontal mediante Kubernetes HPA

---

### RNF-03: Latencia de Comunicación gRPC
**Prioridad:** Media  
**Descripción:** La comunicación entre microservicios mediante gRPC debe ser eficiente.

**Criterios de Aceptación:**
- **Llamadas gRPC internas:** Máximo 100ms en el percentil 95
- **Serialización/Deserialización:** Máximo 10ms
- Utilizar HTTP/2 multiplexing

---

## 2. Disponibilidad

### RNF-04: Uptime del Sistema
**Prioridad:** Alta  
**Descripción:** El sistema debe estar disponible la mayor parte del tiempo para garantizar continuidad del servicio.

**Criterios de Aceptación:**
- **Disponibilidad objetivo:** 99.5% (43.8 horas de downtime anuales)
- **Ventana de mantenimiento:** Domingos 2:00 AM - 5:00 AM (tiempo local)
- **Recuperación ante fallas:** Máximo 15 minutos (MTTR - Mean Time To Recover)

**Estrategias:**
- Implementar health checks en Kubernetes (liveness y readiness probes)
- Configurar réplicas múltiples de cada microservicio
- Implementar circuit breakers para evitar cascadas de fallas

---

### RNF-05: Tolerancia a Fallos
**Prioridad:** Alta  
**Descripción:** El sistema debe continuar operando parcialmente si un componente falla.

**Criterios de Aceptación:**
- Si falla el Notification-Service, las órdenes deben crearse igual (notificación asíncrona)
- Si falla un microservicio, los demás deben seguir funcionando
- Implementar reintentos automáticos en llamadas a servicios externos
- Implementar colas de mensajes para operaciones críticas

**Estrategias:**
- Uso de RabbitMQ/Kafka para desacoplar servicios
- Implementar Dead Letter Queues (DLQ) para mensajes fallidos
- Implementar timeouts en todas las llamadas HTTP/gRPC

---

## 3. Escalabilidad

### RNF-06: Escalabilidad Horizontal
**Prioridad:** Alta  
**Descripción:** El sistema debe poder escalar horizontalmente agregando más instancias de microservicios.

**Criterios de Aceptación:**
- Todos los microservicios deben ser stateless
- Utilizar Horizontal Pod Autoscaler (HPA) en Kubernetes
- Configurar escalado basado en CPU (>70% → escalar)
- Configurar escalado basado en memoria (>80% → escalar)
- Configurar escalado basado en peticiones (RPS)

**Configuración HPA:**
```yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

---

### RNF-07: Escalabilidad de Base de Datos
**Prioridad:** Media  
**Descripción:** Las bases de datos deben soportar crecimiento de datos y carga.

**Criterios de Aceptación:**
- Cada microservicio debe tener su propia base de datos (Database per Service)
- Implementar índices en columnas frecuentemente consultadas
- Configurar connection pool con tamaño máximo de 50 conexiones por instancia
- Considerar réplicas de lectura para consultas intensivas

**Estrategias:**
- MySQL con replicación master-slave
- Implementar caché Redis para reducir carga de BD
- Particionar tablas grandes (órdenes) por fecha

---

## 4. Seguridad

### RNF-08: Autenticación y Autorización
**Prioridad:** Crítica  
**Descripción:** El sistema debe implementar mecanismos robustos de autenticación y autorización.

**Criterios de Aceptación:**
- **JWT:** Tokens firmados con algoritmo HS256 o RS256
- **Expiración de tokens:** 24 horas máximo
- **Secret key:** Mínimo 256 bits, almacenado en Kubernetes Secrets
- **Validación en cada petición:** El API Gateway debe validar JWT antes de enrutar
- **RBAC:** Control de acceso basado en roles (ADMIN, CLIENTE, RESTAURANTE, REPARTIDOR)

**Headers de autenticación:**
```
Authorization: Bearer <jwt_token>
```

---

### RNF-09: Encriptación de Contraseñas
**Prioridad:** Crítica  
**Descripción:** Las contraseñas de usuarios deben estar encriptadas en la base de datos.

**Criterios de Aceptación:**
- Utilizar bcrypt con un mínimo de 12 rounds
- Nunca almacenar contraseñas en texto plano
- Nunca retornar contraseñas en respuestas de API

**Ejemplo:**
```javascript
const hashedPassword = await bcrypt.hash(password, 12);
```

---

### RNF-10: Comunicación Segura (TLS/HTTPS)
**Prioridad:** Alta  
**Descripción:** Todas las comunicaciones externas deben estar encriptadas.

**Criterios de Aceptación:**
- **Frontend ↔ API Gateway:** HTTPS con certificado TLS 1.2+
- **API Gateway ↔ Microservicios internos:** Puede ser HTTP dentro del clúster (red privada)
- Configurar certificados SSL/TLS en el Ingress de Kubernetes
- Forzar redirección HTTP → HTTPS

---

### RNF-11: Protección contra Ataques Comunes
**Prioridad:** Alta  
**Descripción:** El sistema debe estar protegido contra vulnerabilidades comunes.

**Criterios de Aceptación:**
- **SQL Injection:** Utilizar consultas parametrizadas o ORM
- **XSS:** Sanitizar inputs en el frontend
- **CSRF:** Implementar tokens CSRF o validar origen de peticiones
- **Rate Limiting:** Máximo 100 peticiones por minuto por IP
- **CORS:** Configurar orígenes permitidos

**Ejemplo Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100
});
```

---

## 5. Mantenibilidad

### RNF-12: Arquitectura de Microservicios
**Prioridad:** Alta  
**Descripción:** El sistema debe seguir principios de arquitectura de microservicios para facilitar mantenimiento y evolución.

**Criterios de Aceptación:**
- **Separación de responsabilidades:** Cada microservicio tiene una responsabilidad única
- **Independencia de despliegue:** Cada microservicio puede desplegarse independientemente
- **Database per Service:** Cada microservicio tiene su propia base de datos
- **API First:** Contratos de API bien definidos (OpenAPI/Swagger para REST, .proto para gRPC)

---

### RNF-13: Logging y Monitoreo
**Prioridad:** Alta  
**Descripción:** El sistema debe generar logs estructurados y métricas para facilitar debugging y monitoreo.

**Criterios de Aceptación:**
- **Formato de logs:** JSON estructurado
- **Niveles de log:** DEBUG, INFO, WARN, ERROR
- **Información en logs:** timestamp, nivel, servicio, traceId, mensaje, metadatos
- **Centralización:** Logs centralizados en un sistema de observabilidad (ELK Stack o similar)
- **Métricas:** Exponer métricas de Prometheus (/metrics endpoint)

**Ejemplo de log:**
```json
{
  "timestamp": "2026-02-23T10:30:00.000Z",
  "level": "INFO",
  "service": "order-service",
  "traceId": "abc-123-def",
  "message": "Order created successfully",
  "metadata": {
    "orderId": "uuid",
    "userId": "uuid",
    "total": 150.50
  }
}
```

---

### RNF-14: Documentación de Código
**Prioridad:** Media  
**Descripción:** El código debe estar documentado para facilitar mantenimiento por otros desarrolladores.

**Criterios de Aceptación:**
- Funciones complejas deben tener comentarios explicativos
- README en cada microservicio con instrucciones de setup
- Documentación de APIs con Swagger/OpenAPI
- Diagramas de arquitectura actualizados

---

## 6. Portabilidad

### RNF-15: Containerización
**Prioridad:** Crítica  
**Descripción:** Todos los componentes del sistema deben estar containerizados para garantizar portabilidad.

**Criterios de Aceptación:**
- Cada microservicio debe tener un Dockerfile
- Utilizar imágenes base oficiales y ligeras (node:18-alpine, mysql:8.0)
- Las imágenes deben ser multi-stage para optimizar tamaño
- Versionar imágenes con tags semánticos (v1.0.0, v1.1.0)

**Ejemplo Dockerfile:**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY . .
EXPOSE 50051
CMD ["node", "src/index.js"]
```

---

### RNF-16: Orquestación con Kubernetes
**Prioridad:** Crítica  
**Descripción:** El sistema debe desplegarse en Kubernetes para facilitar orquestación y escalabilidad.

**Criterios de Aceptación:**
- Manifiestos YAML para cada microservicio (Deployment, Service, ConfigMap, Secret)
- Configurar Ingress para enrutamiento externo
- Configurar PersistentVolumeClaims para bases de datos
- Namespace dedicado: `delivereats` o `production`

---

## 7. Usabilidad

### RNF-17: Interfaz de Usuario
**Prioridad:** Media  
**Descripción:** El frontend debe ser intuitivo y fácil de usar.

**Criterios de Aceptación:**
- Diseño responsive (móvil, tablet, desktop)
- Tiempo de carga inicial máximo 3 segundos
- Mensajes de error claros y accionables
- Feedback visual en operaciones asíncronas (spinners, toasts)

---

### RNF-18: Experiencia de Desarrollo
**Prioridad:** Media  
**Descripción:** La experiencia de desarrollo debe ser fluida para facilitar colaboración.

**Criterios de Aceptación:**
- Comandos simples para levantar el entorno local (docker-compose up)
- Hot-reload en desarrollo
- Scripts de testing automatizados
- Documentación clara de setup

---

## 8. Confiabilidad

### RNF-19: Integridad de Datos
**Prioridad:** Alta  
**Descripción:** Los datos del sistema deben ser consistentes y no corromperse.

**Criterios de Aceptación:**
- Transacciones ACID en operaciones críticas (creación de órdenes)
- Validaciones de integridad referencial en bases de datos
- Backups diarios de bases de datos
- Retención de backups por 30 días mínimo

---

### RNF-20: Auditoría
**Prioridad:** Media  
**Descripción:** Las operaciones críticas deben ser auditables.

**Criterios de Aceptación:**
- Registrar fecha/hora de creación en todas las entidades
- Registrar quién realizó la operación (userId)
- Mantener logs de operaciones críticas por 90 días
- Implementar soft delete en entidades importantes

---

## 9. Comunicación Asíncrona

### RNF-21: Mensajería con RabbitMQ/Kafka
**Prioridad:** Alta  
**Descripción:** El sistema debe implementar comunicación asíncrona mediante colas de mensajes.

**Criterios de Aceptación:**
- **RabbitMQ:** Configurar exchange tipo `topic` con routing keys claros
- **Durabilidad:** Mensajes deben persistirse en disco
- **Acknowledgment:** Implementar ACK manual para garantizar procesamiento
- **Dead Letter Queue:** Configurar DLQ para mensajes fallidos después de 3 reintentos
- **Latencia:** Máximo 100ms desde publicación hasta consumo

**Routing Keys:**
```
orders.created
orders.updated
orders.cancelled
notifications.email
```

---

### RNF-22: Idempotencia
**Prioridad:** Alta  
**Descripción:** Los consumidores de mensajes deben ser idempotentes para evitar procesamiento duplicado.

**Criterios de Aceptación:**
- Verificar si un mensaje ya fue procesado antes de ejecutar lógica
- Utilizar IDs únicos de mensaje para deduplicación
- Almacenar IDs de mensajes procesados en caché (Redis) por 24 horas

---

## 10. Despliegue y DevOps

### RNF-23: CI/CD Pipeline
**Prioridad:** Alta  
**Descripción:** El sistema debe tener un pipeline de integración y despliegue continuo.

**Criterios de Aceptación:**
- **CI:** Ejecutar tests automáticamente en cada commit
- **Build:** Construir imágenes Docker automáticamente
- **Push:** Subir imágenes a Docker Hub o GCR
- **Deploy:** Desplegar automáticamente a Kubernetes en ambiente de desarrollo
- **Deploy manual:** Require aprobación para producción

**Stages del Pipeline:**
1. Lint & Format
2. Unit Tests
3. Build Docker Image
4. Push to Registry
5. Deploy to Dev
6. Manual Approval
7. Deploy to Production

---

### RNF-24: Estrategias de Rollout
**Prioridad:** Alta  
**Descripción:** Los despliegues deben realizarse de manera segura sin downtime.

**Criterios de Aceptación:**
- **Estrategia:** Rolling Update (por defecto)
- **Configuración:**
  - maxSurge: 1 (máximo 1 pod adicional durante actualización)
  - maxUnavailable: 0 (garantizar 0 downtime)
- **Tiempo de actualización:** Máximo 5 minutos
- **Health checks:** Validar que nuevos pods estén healthy antes de eliminar los antiguos

**Kubernetes Deployment:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

---

### RNF-25: Estrategias de Rollback
**Prioridad:** Alta  
**Descripción:** Debe ser posible revertir un despliegue rápidamente si se detectan problemas.

**Criterios de Aceptación:**
- **Rollback manual:** Comando `kubectl rollout undo deployment/<name>`
- **Rollback automático:** Si el health check falla después de 2 minutos, revertir automáticamente
- **Historial:** Mantener las últimas 5 versiones para rollback
- **Tiempo de rollback:** Máximo 3 minutos

**Comando:**
```bash
kubectl rollout undo deployment/order-service --to-revision=3
```

---

### RNF-26: Variables de Entorno y Secrets
**Prioridad:** Crítica  
**Descripción:** Las configuraciones sensibles deben manejarse de manera segura.

**Criterios de Aceptación:**
- **Secrets:** JWT_SECRET, DB_PASSWORD, API_KEYS almacenados en Kubernetes Secrets
- **ConfigMaps:** Variables de configuración no sensibles (URLs, puertos)
- **Nunca hardcodear:** Credenciales en el código fuente
- **Rotación:** Rotar secrets cada 90 días

**Ejemplo Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: delivereats-secrets
type: Opaque
data:
  JWT_SECRET: <base64_encoded>
  DB_PASSWORD: <base64_encoded>
```

---

## 11. Cumplimiento y Regulaciones

### RNF-27: GDPR y Privacidad
**Prioridad:** Media  
**Descripción:** El sistema debe cumplir con regulaciones de protección de datos.

**Criterios de Aceptación:**
- Los usuarios deben poder solicitar eliminación de sus datos
- Implementar consentimiento explícito para uso de datos
- Encriptar datos sensibles en tránsito y en reposo
- Mantener logs de acceso a datos personales

---

### RNF-28: Licencias de Software
**Prioridad:** Baja  
**Descripción:** Utilizar solo software con licencias compatibles.

**Criterios de Aceptación:**
- Revisar licencias de dependencias npm/maven
- Preferir licencias permisivas (MIT, Apache 2.0)
- Documentar licencias de terceros

---

## 12. Resumen de Prioridades

| Prioridad | Cantidad | Ejemplos |
|-----------|----------|----------|
| Crítica | 4 | Autenticación, Encriptación, Containerización, Secrets |
| Alta | 15 | Rendimiento, Disponibilidad, Escalabilidad, Seguridad |
| Media | 8 | Usabilidad, Documentación, Auditoría |
| Baja | 1 | Licencias |

---

## 13. Métricas de Calidad

El sistema será evaluado según las siguientes métricas:

| Métrica | Objetivo | Herramienta |
|---------|----------|-------------|
| Uptime | 99.5% | Prometheus + Alertmanager |
| Response Time (p95) | < 500ms | Grafana |
| Error Rate | < 1% | Logs + Sentry |
| Test Coverage | > 70% | Jest/JUnit |
| Security Score | A+ | OWASP ZAP |
| Code Quality | > 8.0 | SonarQube |

---

**Fecha de actualización:** 23 de febrero de 2026  
**Versión:** 1.1.0  
**Estado:** Fase 2 - En desarrollo
