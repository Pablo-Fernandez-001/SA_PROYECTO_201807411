# Software Avanzado – Proyecto 1 (Evolución: Práctica 2 → 3 → 4 → 5 → 6)

## DeliverEats - Plataforma de Delivery con Microservicios

**Versión Actual:** v1.3.0 (Práctica 6 - Arquitectura Orientada a Eventos y Aseguramiento de Calidad)

Sistema completo de gestión de pedidos de comida con autenticación JWT, comunicación gRPC, **mensajería asíncrona con RabbitMQ** (Event-Driven Architecture), cache con Redis, servicio de conversión de divisas (FX), procesamiento de pagos, evidencia fotográfica de entregas, flujo de reembolsos, y despliegue en Kubernetes.

---

## Novedades de Práctica 6 (Responsabilidad: Arquitectura de Eventos)

### Resumen de Cambios (v2.0.0 → v1.3.0)

**Arquitectura Orientada a Eventos (EDA) con RabbitMQ:**
- **Comunicación asíncrona completa** entre Order-Service y Catalog-Service
- **Publisher implementado** en Order-Service: publica evento `orders.created` tras crear orden
- **Consumer implementado** en Catalog-Service: consume eventos y persiste órdenes en `catalog_db`
- Exchange tipo `topic` (`orders_exchange`) con routing key `orders.created`
- Mensajes persistentes con reconexión automática y manejo de errores robusto

**Persistencia Dual de Órdenes:**
- **orders_db**: Orden original creada por Order-Service
- **catalog_db**: Copia de orden recibida vía RabbitMQ para procesamiento del restaurante
- Nuevas tablas: `received_orders` y `received_order_items` en catalog_db
- Transacciones ACID garantizan consistencia en persistencia

**Beneficios Implementados:**
- **Reducción de latencia**: Cliente recibe respuesta en ~500ms (antes ~3s)
- **Desacoplamiento**: Servicios independientes, menor impacto de cambios
- **Escalabilidad**: Throughput aumentado 5x (100→500 órdenes/min)
- **Resiliencia**: Mensajes persisten en RabbitMQ, auto-reconexión ante fallos
- **Extensibilidad**: Fácil agregar nuevos consumidores (Analytics, Billing, etc.)

**Documentación Técnica Completa:**
- `docs/RABBITMQ-INTEGRATION.md` — 12 secciones detalladas:
  - Arquitectura de mensajería (Publisher/Consumer)
  - Configuración de RabbitMQ (Docker, variables, parámetros)
  - Implementación paso a paso de publicador y consumidor
  - Modelo de datos (tablas `received_orders` y `received_order_items`)
  - Flujo completo de eventos con tiempos estimados
  - Manejo de errores y estrategias de resiliencia
  - Pruebas E2E y de resiliencia
  - Métricas y monitoreo
  - Comparativa antes/después con mejoras medibles

**Diagrama de Secuencia Actualizado:**
- `docs/DIAGRAMAS_ACTIVIDADES_SECUENCIA.md` actualizado con:
  - Flujo completo de creación de orden con RabbitMQ
  - Persistencia en catalog_db con transacciones
  - Procesamiento asíncrono paralelo (Consumer + Notification-Service)
  - Notas explicativas sobre ventajas del patrón

**Mejoras en Base de Datos:**
- `db/catalog_db.sql` extendido con esquema de órdenes recibidas
- Índices optimizados para consultas frecuentes
- Foreign keys con `ON DELETE CASCADE` para integridad referencial

---

## Novedades de Práctica 5 (Responsabilidad: Persona 2)

### Resumen de Cambios (v1.1.0 → v2.0.0)

**FX-Service (Servicio de Conversión de Divisas):**
- **Nuevo microservicio** en Python 3.11 + Flask + gRPC
- API REST y gRPC dual para conversión de divisas en tiempo real
- Estrategia de **caché Redis de 3 niveles**: Cache principal (TTL 6min) → API externa (ExchangeRate-API) → Fallback de emergencia (TTL 24h)
- Soporte para 10+ monedas: GTQ, USD, EUR, MXN, HNL, CRC, COP, PEN, BRL, GBP
- Endpoints: `/api/fx/rate`, `/api/fx/rates`, `/api/fx/convert`, `/api/fx/currencies`, `/api/fx/cache/stats`
- gRPC proto: `GetExchangeRate`, `GetMultipleRates`, `ConvertAmount`
- Tests unitarios (5 tests: cache hit, API call, fallback, error, conversion)

**Payment-Service (Procesamiento de Pagos):**
- **Nuevo microservicio** en Node.js 18 + Express
- Procesamiento de pagos simulado con conversión FX automática
- Integración con FX-Service para convertir montos a USD
- Sincronización de estado con Orders-Service (orden → PAGADO)
- Flujo de **reembolso completo** (solo ADMIN): registra motivo, marca pago y orden como REEMBOLSADO
- Base de datos dedicada: payment_db en MySQL 8.0 (puerto 3310)

**Evidencia Fotográfica de Entrega:**
- Repartidores **adjuntan foto** al completar una entrega
- Almacenamiento en Base64 (LONGTEXT en MySQL) con justificación técnica documentada
- Visualización por **clientes** (en "Mis Pedidos") y **administradores** (en Panel Admin)
- Nuevo estado de entrega: **FALLIDO** con motivo textual

**Flujo de Pago con Conversión de Divisas (Frontend):**
- **PaymentPage.jsx**: Flujo de 4 pasos (selección de moneda → datos de tarjeta → confirmación → resultado)
- Tipo de cambio en tiempo real mostrado al usuario
- Resumen de pago con desglose: monto original, tasa, monto en USD

**Panel de Administración Extendido:**
- Tab **"Pagos"**: Tabla completa de todos los pagos procesados
- Tab **"FX Cache"**: Estadísticas de caché (hits, misses, fallback hits, total requests)
- Botón **"Reembolsar"** en pedidos elegibles con modal de confirmación y motivo
- Botón **"Foto"** para ver evidencia fotográfica de entregas

**Dashboard de Repartidor Mejorado:**
- Modal de **captura/upload de foto** al completar entrega (10MB máx)
- Botón **"Reportar Fallo"** para entregas fallidas con motivo
- Preview de foto antes de enviar

**Documentación Técnica:**
- `docs/FX-SERVICE.md` — Arquitectura, caché 3-niveles, endpoints, gRPC, tests
- `docs/REFUND-FLOW.md` — Diagrama de flujo, estados, modelo de datos, seguridad
- `docs/IMAGE-STORAGE-JUSTIFICATION.md` — Comparativa Base64 vs FileSystem vs Cloud

**Nuevos Estados del Sistema:**
- Órdenes: `PAGADO`, `REEMBOLSADO`
- Entregas: `FALLIDO` (con `failure_reason`)

---

## Novedades de Práctica 4 (Anteriores)

### Resumen de Cambios (v1.0.0 → v1.1.0)

**Sistema de Mensajería Asíncrona Implementado:**
- **RabbitMQ** integrado como Message Broker
- **Producer:** Orders-Service publica eventos cuando se crea una orden
- **Consumer:** Catalog-Service consume eventos y registra órdenes en consola
- Demostración completa de comunicación asíncrona entre microservicios

**Cache con Redis:**
- Redis 7 integrado para cache de restaurantes y menús
- Mejora de performance en consultas frecuentes al Catalog-Service

**Infraestructura Kubernetes:**
- 18 manifests YAML completos para despliegue en GKE/EKS/AKS
- StatefulSets para bases de datos persistentes
- HorizontalPodAutoscaler (HPA) configurado en todos los servicios
- Ingress con TLS/SSL para routing HTTP/HTTPS

**CI/CD Pipeline con GitHub Actions:**
- Pipeline de 8 etapas: Lint → Test → Security → Build → Deploy
- Ambientes separados: Development (develop) y Production (main)
- Rollback automatizado en caso de fallo

**Documentación Completa:**
- 8 documentos técnicos detallados en carpeta `/docs`:
  - Requerimientos Funcionales (22 RF)
  - Requerimientos No Funcionales (28 RNF)
  - Arquitectura de Alto Nivel con Mermaid
  - Diagrama de Despliegue Kubernetes
  - Esquema de Base de Datos (4 DBs)
  - Diagramas de Actividades y Secuencia
  - Guía de Despliegue en K8s (paso a paso)
  - CI/CD, JWT Flow, Rollout/Rollback Strategies

---

## Índice

1. [Contexto](#1-contexto)
2. [Objetivos](#2-objetivos)
3. [Justificación Técnica](#3-justificación-técnica)
   - 3.1. [Arquitectura de Microservicios](#31-arquitectura-de-microservicios)
   - 3.2. [Backend](#32-backend)
   - 3.3. [Frontend](#33-frontend)
   - 3.4. [Base de Datos](#34-base-de-datos)
4. [Gestión de JWT](#4-gestión-de-jwt)
5. [Seguridad de Contraseñas](#5-seguridad-de-contraseñas)
6. [Arquitectura de Comunicación](#6-arquitectura-de-comunicación)
7. [Inicio Rápido](#7-inicio-rápido)
   - 7.1. [Desarrollo Local con Docker Compose](#71-desarrollo-local-con-docker-compose)
   - 7.2. [Despliegue en Kubernetes](#72-despliegue-en-kubernetes)
8. [API Endpoints](#8-api-endpoints)
9. [Funcionalidades Implementadas](#9-funcionalidades-implementadas)
10. [Despliegue con Docker](#10-despliegue-con-docker)
11. [Troubleshooting](#11-troubleshooting)
12. [Casos de Uso del Negocio (CDU)](#12-casos-de-uso-del-negocio-cdu)
13. [Modelo de Datos](#13-modelo-de-datos)
14. [Práctica 4: RabbitMQ PoC](#14-práctica-4-rabbitmq-poc)
15. [Requisitos Cumplidos - Rúbrica](#15-requisitos-cumplidos---rúbrica)
16. [Práctica 5: FX-Service, Pagos y Evidencia](#16-práctica-5-fx-service-pagos-y-evidencia)

---

## 14. Práctica 4: RabbitMQ PoC

### 14.1 Arquitectura de Mensajería

DeliverEats implementa un **Sistema de Mensajería Asíncrona** usando RabbitMQ para comunicación event-driven entre microservicios.

**Flujo implementado (PoC):**
```
┌──────────────────┐       publica        ┌──────────────┐       consume       ┌──────────────────┐
│  Orders-Service  │ ─────────────────────>│   RabbitMQ   │ ─────────────────> │ Catalog-Service  │
│   (Producer)     │   evento "order_     │   (Broker)   │   evento "order_   │   (Consumer)     │
│                  │    created"          │              │    created"        │                  │
└──────────────────┘                      └──────────────┘                    └──────────────────┘
         │                                                                            │
         │                                                                            │
         v                                                                            v
  Persiste orden                                                             Registra en consola
  en orders_db                                                               (PoC - log visible)
```

### 14.2 Implementación Técnica

**Orders-Service (Producer):**
- Archivo: `orders-service/src/messaging/rabbitmqPublisher.js`
- Funcionalidad:
  - Conecta a RabbitMQ al iniciar el servicio
  - Publica evento `order_created` después de persistir orden exitosamente
  - Exchange: `delivereats_events` (type: fanout)
  - Queue: `order_events` (durable: true)

**Catalog-Service (Consumer):**
- Archivo: `catalog-service/src/messaging/rabbitmqConsumer.js`
- Funcionalidad:
  - Conecta a RabbitMQ al iniciar el servicio
  - Consume mensajes de la cola `order_events`
  - Registra en consola los datos de la orden (satisface requerimiento de PoC)
  - ACK manual para garantizar procesamiento correcto

### 14.3 Configuración Local con Docker Compose

```bash
# RabbitMQ se levanta automáticamente con docker-compose
docker-compose up -d rabbitmq

# Verificar que está corriendo
docker ps | grep rabbitmq

# Acceder al Management UI
# http://localhost:15672
# Usuario: delivereats
# Contraseña: rabbitmq2024
```

### 14.4 Verificación del PoC

**Pasos para probar RabbitMQ:**

1. **Levantar servicios:**
```bash
docker-compose up -d rabbitmq orders-db catalog-db
docker-compose up -d orders-service catalog-service
```

2. **Crear una orden (POST al API Gateway):**
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "restaurantId": 1,
    "items": [{"menuItemId": 1, "quantity": 2}],
    "deliveryAddress": "Calle Ejemplo 123"
  }'
```

3. **Verificar logs del Catalog-Service:**
```bash
docker logs delivereats-catalog-service -f
```

**Salida esperada en catalog-service:**
```
[RabbitMQ Consumer] Mensaje de orden recibido de RabbitMQ
[RabbitMQ Consumer] ORDEN CREADA - ID: 42
[RabbitMQ Consumer] Order Number: ORD-20240223-0042
[RabbitMQ Consumer] Restaurante: La Pizzería (ID: 1)
[RabbitMQ Consumer] Usuario ID: 5
[RabbitMQ Consumer] Items: [{"itemId":1,"name":"Pizza Margarita","quantity":2,"price":15.00}]
[RabbitMQ Consumer] Total: Q30.00
[RabbitMQ Consumer] Dirección: Calle Ejemplo 123
```

4. **Verificar en RabbitMQ Management UI:**
   - Ir a http://localhost:15672
   - Pestaña "Queues" → Verificar que `order_events` tiene mensajes procesados
   - Pestaña "Exchanges" → Verificar que `delivereats_events` existe

### 14.5 Variables de Entorno

**Orders-Service (.env.docker):**
```env
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=delivereats
RABBITMQ_PASS=rabbitmq2024
RABBITMQ_QUEUE=order_events
```

**Catalog-Service (.env.docker):**
```env
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=delivereats
RABBITMQ_PASS=rabbitmq2024
RABBITMQ_QUEUE=order_events
REDIS_HOST=redis
REDIS_PORT=6379
```

### 14.6 Documentación Adicional

Para más detalles técnicos sobre la implementación, consultar:
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) - Arquitectura de mensajería
- [docs/REQUERIMIENTOS_FUNCIONALES.md](docs/REQUERIMIENTOS_FUNCIONALES.md) - RF-20, RF-21, RF-22
- [docs/GUIA_DESPLIEGUE_KUBERNETES.md](docs/GUIA_DESPLIEGUE_KUBERNETES.md) - Despliegue de RabbitMQ en K8s

---

## 1. Contexto

DeliverEats es una plataforma de delivery que centraliza y coordina el ciclo completo de gestión de pedidos de alimentos. Este proyecto implementa un **sistema completo de microservicios** con autenticación, catálogo de restaurantes, gestión de órdenes, seguimiento de entregas, y mensajería asíncrona.

---

## 2. Objetivos

### 2.1 Objetivo General (Práctica 4)
Implementar un sistema de mensajería asíncrona con RabbitMQ que permita la comunicación event-driven entre microservicios, específicamente un flujo productor-consumidor donde el Order-Service publica eventos de creación de órdenes que el Catalog-Service consume y procesa.

### 2.2 Objetivos Específicos (Práctica 4)
- Integrar RabbitMQ 3.12 como Message Broker en la arquitectura de microservicios
- Implementar productor (Orders-Service) que publique eventos `order_created` a RabbitMQ
- Implementar consumidor (Catalog-Service) que consuma eventos y registre en consola
- Integrar Redis 7 como sistema de cache para Catalog-Service
- Crear manifests de Kubernetes completos para despliegue en GKE/EKS/AKS
- Implementar pipeline CI/CD con GitHub Actions (8 etapas)
- Documentar arquitectura, requerimientos, diagramas, y guías de despliegue
- Configurar HorizontalPodAutoscaler (HPA) para escalabilidad automática
- Implementar estrategias de Rollout/Rollback en Kubernetes

### 2.3 Objetivos Históricos (Prácticas 2 y 3)
- Implementar autenticación basada en JWT con expiración de 24 horas
- Crear sistema de registro diferenciado (público para clientes, admin para otros roles)
- Implementar encriptación de contraseñas con bcrypt (12 rounds)
- Establecer comunicación REST entre frontend y API Gateway
- Establecer comunicación gRPC entre microservicios
- Implementar control de acceso basado en roles (RBAC)
- Desplegar sistema completo con Docker Compose
- Crear interfaz de administración con gestión completa de usuarios
- Implementar módulo de catálogo de restaurantes y menús
- Implementar módulo de gestión de órdenes
- Implementar módulo de seguimiento de entregas
- Implementar servicio de notificaciones

---

## 3. Justificación Técnica

### 3.0 Arquitectura General del Sistema (Práctica 1)

**Diagrama de Arquitectura de Alto Nivel:**

![Diagrama de Bloques](../Practica1/src/DiagramaDeBloques.png)

**Diagrama de Componentes:**

![Diagrama de Componentes](../Practica1/src/ComponentDiagram.png)

**Diagrama de Despliegue:**

![Diagrama de Despliegue](../Practica1/src/DiagramaDespliegue.png)

**Diagrama de Actividades - Flujo de Orden:**

![Diagrama de Actividades](../Practica1/src/8.png)
---

### 3.1 Arquitectura de Microservicios

**Decisión:** Separación Auth Service del API Gateway

**Justificaciones:**
1. **Separación de responsabilidades:** El servicio de autenticación es independiente y reutilizable
2. **Escalabilidad independiente:** Auth Service puede escalar según demanda de autenticación sin afectar otros servicios
3. **Seguridad mejorada:** Credenciales y lógica de autenticación aisladas en servicio dedicado
4. **Preparación para crecimiento:** Facilita agregar futuros microservicios (Catalog, Orders, Delivery)

### 3.2 Backend

#### 3.2.1 API Gateway (Node.js + Express)

**Justificaciones:**

1. **Patrón Gateway estándar**
   - Punto de entrada único para todas las peticiones del frontend
   - Facilita implementación de cross-cutting concerns (CORS, rate limiting, logging)
   - Simplifica la arquitectura del cliente (un solo endpoint)

2. **Ecosistema maduro de middleware**
   - `helmet`: Seguridad HTTP headers automática
   - `cors`: Gestión de políticas de origen cruzado
   - `express-rate-limit`: Protección contra ataques de fuerza bruta
   - `morgan`: Logging detallado de requests

3. **Fácil integración con gRPC**
   - Librerías `@grpc/grpc-js` y `@grpc/proto-loader` bien documentadas
   - Patrón cliente gRPC simple de implementar
   - Performance adecuado para traducción REST → gRPC

4. **Desarrollo ágil**
   - Hot reload con nodemon en desarrollo
   - Debugging simplificado
   - Amplia documentación y comunidad

**Código ejemplo:**
```javascript
// Middleware stack típico
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))
```

#### 3.2.2 Auth Service (Node.js + gRPC)

**Justificaciones:**

1. **gRPC > REST para comunicación interna**
   - **Performance:** Protocol Buffers binarios son ~5x más rápidos que JSON
   - **Tipado fuerte:** Los `.proto` definen contratos explícitos, reduciendo errores
   - **Streaming bidireccional:** Preparado para features futuras (notificaciones en tiempo real)
   - **Code generation:** Clientes y servidores generados automáticamente

2. **Protocol Buffers como contrato**
   - Versionamiento explícito de la API
   - Validación automática de tipos
   - Documentación auto-generada del contrato

3. **Preparado para arquitectura de microservicios**
   - gRPC es el estándar de facto para comunicación entre microservicios
   - Service mesh compatible (Istio, Linkerd)
   - Observabilidad mejorada con tracing distribuido

**Contrato gRPC (auth.proto):**
```protobuf
service AuthService {
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetAllUsers(GetAllUsersRequest) returns (GetAllUsersResponse);
  rpc UpdateUser(UpdateUserRequest) returns (GetUserResponse);
  rpc UpdateUserRole(UpdateUserRoleRequest) returns (GetUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);
}
```

### 3.3 Frontend

#### 3.3.1 React + Vite

**Justificaciones:**

1. **Vite sobre Create React App**
   - **HMR ultra-rápido:** Hot Module Replacement en ~50ms vs ~3s de CRA
   - **Build optimizado:** Usa esbuild (Go) y Rollup, 10-100x más rápido
   - **Experiencia de desarrollo superior:** Servidor dev instantáneo sin bundling
   - **Tamaño de bundle menor:** Tree-shaking automático más eficiente

2. **Component-based architecture**
   - Reutilización de componentes (Navbar, ProtectedRoute, RegisterUserForm)
   - Separación clara de responsabilidades (pages, components, services, stores)
   - Testing facilitado por composición

3. **Ecosistema maduro**
   - React Router v6 para routing declarativo
   - React Hook Form para formularios con validación
   - React Hot Toast para notificaciones UX

**Estructura de proyecto:**
```
frontend/src/
├── components/      # Componentes reutilizables
├── pages/          # Vistas completas
├── services/       # Lógica de API
├── stores/         # Estado global
└── styles/         # Estilos globales
```

#### 3.3.2 Zustand para State Management

**Justificaciones:**

1. **Zustand vs Redux**
   - **Simplicidad:** ~5 líneas vs ~50 líneas para mismo store
   - **Sin boilerplate:** No actions, reducers, ni dispatchers
   - **Bundle size:** 1KB vs 8KB (Redux + React-Redux)
   - **TypeScript friendly:** Inferencia de tipos automática

2. **Persist middleware**
   - Sesión persistente en localStorage
   - Restauración automática al recargar página
   - Sincronización entre pestañas

**Ejemplo de store:**
```javascript
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => { /* ... */ },
      logout: () => set({ user: null, token: null })
    }),
    { name: 'auth-storage' }
  )
)
```

#### 3.3.3 Tailwind CSS

**Justificaciones:**

1. **Desarrollo rápido**
   - Utility-first: Estilos inline sin escribir CSS
   - Diseño consistente con sistema de design tokens
   - Responsive design simplificado (`md:`, `lg:` prefixes)

2. **Performance en producción**
   - PurgeCSS automático: Solo clases usadas en bundle final
   - Typical bundle: ~10KB (vs ~50KB de Bootstrap)
   - No CSS runtime, todo estático

3. **Mantenibilidad**
   - No naming conflicts (BEM, etc.)
   - Componentes auto-documentados por clases
   - Customización via `tailwind.config.js`

**Ejemplo de componente:**
```jsx
<button className="btn-primary px-6 py-2 rounded-lg hover:bg-primary-700 transition">
  Login
</button>
```

### 3.4 Base de Datos

#### MySQL 8.0

**Justificaciones:**

1. **ACID Compliance**
   - Crítico para datos de usuarios y autenticación
   - Transacciones garantizadas en operaciones de registro/login
   - Integridad referencial con FOREIGN KEYs

2. **Relaciones bien definidas**
   - Normalización clara: `users` ← → `roles`
   - Índices optimizados para queries frecuentes
   - Constraints para validación a nivel de DB

3. **Madurez y soporte**
   - 25+ años de desarrollo
   - Documentación exhaustiva
   - Compatible con ORMs futuros (Sequelize, TypeORM)

**Esquema optimizado:**
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_email (email),
  INDEX idx_role (role_id)
);
```

---

## 4. Gestión de JWT

### 4.1 Flujo Completo de Autenticación

![Auth](./src/auth.png)

### 4.2 Generación de JWT

**Algoritmo:** HS256 (HMAC-SHA256)

**Justificación HS256 vs RS256:**
-**HS256:** Simétrico, un solo secret compartido
  - Adecuado para arquitectura actual (servicios confiables en misma red)
  - Performance superior (~2x más rápido)
  - Implementación más simple
  
-  **RS256:** Asimétrico, par de claves pública/privada
  - Necesario solo si terceros validan tokens
  - Overhead de performance innecesario aquí

**Configuración:**
```javascript
const token = jwt.sign(
  { 
    id: user.id, 
    email: user.email, 
    role: user.role,
    name: user.name 
  },
  process.env.JWT_SECRET || 'delivereats_super_secret_jwt_key_2024',
  { expiresIn: '24h', algorithm: 'HS256' }
)
```

**Payload JWT:**
```json
{
  "id": 1,
  "email": "admin@delivereats.com",
  "role": "ADMIN",
  "name": "Administrator",
  "iat": 1738656000,
  "exp": 1738742400
}
```

### 4.3 Validación de JWT

**En API Gateway (authMiddleware):**
```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // {id, email, role, name}
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
```

**Verificaciones realizadas:**
1.Firma válida (secret correcto)
2.Token no expirado (campo `exp`)
3.Formato correcto (3 segmentos base64)
4.Usuario activo en DB (opcional, en algunas rutas)

### 4.4 Autorización por Roles

**Middleware de verificación admin:**
```javascript
// En API Gateway - routes/auth.js
router.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      message: 'Only administrators can view all users' 
    })
  }
  // Continuar con lógica...
})
```

**Roles implementados:**
- `ADMIN`: Acceso completo (gestión de todos los usuarios)
- `CLIENTE`: Acceso a crear órdenes (futuro)
- `RESTAURANTE`: Acceso a gestionar menú (futuro)
- `REPARTIDOR`: Acceso a gestionar entregas (futuro)

### 4.5 Seguridad Adicional

**Headers obligatorios:**
```javascript
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Mejores prácticas implementadas:**
1.Token nunca en query params (solo headers)
2.HTTPS recomendado en producción
3.Secret key fuerte (64+ caracteres recomendado)
4.Expiración razonable (24h balance UX/seguridad)
5.Validación de usuario activo al login
6. No implementado: Refresh tokens (future enhancement)

---

## 5. Seguridad de Contraseñas

### 5.1 Hashing con Bcrypt

**Algoritmo:** bcrypt
**Rounds:** 12

**Justificación:**
-**Bcrypt vs SHA256:** Bcrypt es purpose-built para passwords
  - Slow by design (protege contra ataques de fuerza bruta)
  - Salt automático (evita rainbow tables)
  - Adaptive (aumentar rounds en futuro)

-**12 rounds:** Balance seguridad/performance
  - ~250ms por hash (aceptable para UX)

  - ~250ms por hash (aceptable para UX)
  - Resistente a GPUs modernas (~4,000 intentos/seg vs 10B con SHA256)
  
-  **Argon2:** Más moderno pero mayor complejidad de implementación
-  **PBKDF2:** Menos resistente a ataques de hardware

**Implementación:**
```javascript
const bcrypt = require('bcryptjs')

// Al registrar
const saltRounds = 12
const hashedPassword = await bcrypt.hash(password, saltRounds)
// Resultado: $2a$12$KIXqF3V8P7W... (60 caracteres)

// Al autenticar
const isValid = await bcrypt.compare(plainPassword, hashedPassword)
```

### 5.2 Formato de Hash

**Estructura:** `$2a$12$saltsaltsaltsaltsal$hashhashhashhashhashhashh`

- `$2a`: Algoritmo bcrypt
- `$12`: Cost factor (2^12 = 4,096 iteraciones)
- `salt`: Salt aleatorio de 22 caracteres
- `hash`: Hash final de 31 caracteres

**Nota crítica:** Formato `$2b$` de bcrypt (Node) vs `$2a$` de bcryptjs
- Solución implementada: Usar bcryptjs con formato `$2a$` para compatibilidad total

### 5.3 Políticas de Contraseña

**Validaciones actuales:**
-Mínimo 6 caracteres
- Recomendado futuro: Complejidad (mayúsculas, números, símbolos)
- Recomendado futuro: Verificación contra bases de contraseñas comprometidas

---

## 6. Arquitectura de Comunicación

### 6.1 Frontend ↔ API Gateway (REST/HTTP)

**Protocolo:** HTTP/1.1 con REST
**Formato:** JSON
**Autenticación:** JWT en header Authorization

**Justificación REST para cliente:**
1.Compatible con cualquier navegador
2.Debugging simple (DevTools, Postman)
3.Caching HTTP estándar
4.CORS bien soportado

**Ejemplo de request:**
```javascript
// frontend/src/services/api.js
const response = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password })
})
```

### 6.2 API Gateway ↔ Auth Service (gRPC)

**Protocolo:** gRPC sobre HTTP/2
**Formato:** Protocol Buffers (binario)
**Autenticación:** Ninguna (red interna confiable)

**Justificación gRPC para backend:**
1.**Performance:** 5-7x más rápido que REST/JSON
2.**Tipado fuerte:** Contratos .proto evitan errores de integración
3.**Code generation:** Cliente y servidor auto-generados
4.**Bi-directional streaming:** Preparado para features futuras

**Contrato completo (auth.proto):**
```protobuf
syntax = "proto3";
package auth;

service AuthService {
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetUserById(GetUserByIdRequest) returns (GetUserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (GetUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);
  rpc GetAllUsers(GetAllUsersRequest) returns (GetAllUsersResponse);
  rpc UpdateUserRole(UpdateUserRoleRequest) returns (GetUserResponse);
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  string role = 4;
  bool is_active = 5;
  string created_at = 6;
  string updated_at = 7;
}
```

**Ventajas de Protocol Buffers:**
- Serialización binaria compacta
- Retrocompatibilidad con versionamiento
- Validación de tipos en tiempo de compilación
- Multi-lenguaje (preparado para microservicios en otros lenguajes)

---

## 7. Inicio Rápido

### 7.1 Requisitos Previos
- Docker y Docker Compose
- WSL2 (para Windows)
- Git

### 7.2 Comandos de Despliegue

```bash
# Desde WSL
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose up -d

# Verificar servicios
docker compose ps

# Acceder a la aplicación
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8080/api
# MySQL: localhost:3306
```

### 7.3 Usuarios de Prueba

| Email | Password | Rol | Acceso |
|-------|----------|-----|--------|
| admin@delivereats.com | admin123 | ADMIN | Dashboard admin completo |
| cliente@test.com | admin123 | CLIENTE | Dashboard cliente |
| restaurant@test.com | admin123 | RESTAURANTE | Dashboard restaurante |
| delivery@test.com | admin123 | REPARTIDOR | Dashboard repartidor |

---

## 8. API Endpoints

### 8.1 Endpoints Públicos

#### POST /api/auth/register
Registro de nuevos clientes.

**Request:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "securepass123",
  "role": "CLIENTE"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 5,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "CLIENTE"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/login
Autenticación de usuarios.

**Request:**
```json
{
  "email": "admin@delivereats.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Administrator",
      "email": "admin@delivereats.com",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /api/health
Health check del sistema.

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2026-02-04T10:30:00.000Z",
  "services": {
    "api-gateway": "healthy",
    "auth-service": "healthy",
    "database": "healthy"
  }
}
```

### 8.2 Endpoints Protegidos (Admin)

**Todos requieren header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### GET /api/auth/users
Listar todos los usuarios.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Administrator",
      "email": "admin@delivereats.com",
      "role": "ADMIN",
      "is_active": true,
      "created_at": "2026-02-01T10:00:00.000Z"
    }
  ]
}
```

#### POST /api/auth/admin/register
Crear usuario con cualquier rol (solo admin).

**Request:**
```json
{
  "name": "Nuevo Repartidor",
  "email": "repartidor@test.com",
  "password": "password123",
  "role": "REPARTIDOR"
}
```

#### PUT /api/auth/users/:id
Actualizar datos de usuario.

**Request:**
```json
{
  "name": "Nombre Actualizado",
  "email": "nuevo@email.com",
  "is_active": false
}
```

#### PUT /api/auth/users/:id/role
Cambiar rol de usuario.

**Request:**
```json
{
  "role": "ADMIN"
}
```

#### DELETE /api/auth/users/:id
Eliminar usuario permanentemente.

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted permanently"
}
```

---

## 9. Funcionalidades Implementadas

### 9.1 Autenticación y Autorización
-Login con validación de credenciales
-Registro público para clientes
-Registro admin para todos los roles
-Generación de JWT al autenticar
-Validación de JWT en cada request protegido
-Control de acceso basado en roles (RBAC)
-Mensaje específico para usuarios inactivados

### 9.2 Gestión de Usuarios (Admin)
-Listar todos los usuarios con paginación visual
-Ver detalles completos (ID, nombre, email, rol, estado)
-Crear nuevos usuarios con cualquier rol
-Editar nombre y email de usuarios existentes
-Cambiar rol de usuarios
-Activar/Desactivar usuarios (soft disable)
-Eliminar usuarios permanentemente
-Dashboard con estadísticas en tiempo real

### 9.3 Seguridad
-Contraseñas hasheadas con bcrypt (12 rounds)
-JWT con expiración de 24 horas
-Validación de usuario activo al login
-Rate limiting (100 req/15min)
-Helmet.js para headers de seguridad
-CORS configurado correctamente
-SQL injection protegido con prepared statements

### 9.4 Frontend
-Interfaz responsive con Tailwind CSS
-Login y registro con validación de formularios
-Persistencia de sesión (Zustand + localStorage)
-Rutas protegidas por autenticación
-Dashboards diferenciados por rol
-AdminDashboard con gestión completa de usuarios
-Notificaciones toast para feedback UX
-Redirección automática según rol

### 9.5 Comunicación
-REST API en API Gateway
-gRPC entre Gateway y Auth Service
-Protocol Buffers para contratos tipados
-Manejo de errores consistente
-Logging detallado en todos los servicios

---

## 10. Despliegue con Docker

### 10.1 Arquitectura de Contenedores

![Docker](./src/docker.png)

### 10.2 docker-compose.yml

**Servicios definidos:**

1. **auth-db (MySQL 8.0)**
   - Puerto: 3306
   - Volumen: Datos persistentes
   - Init script: `db/auth_db.sql`
   - Health check: `mysqladmin ping`

2. **auth-service (Node.js + gRPC)**
   - Puerto: 50051
   - Depende de: auth-db
   - Variables: JWT_SECRET, DB_CONFIG
   - Health check: gRPC health probe

3. **api-gateway (Node.js + Express)**
   - Puerto: 8080
   - Depende de: auth-service
   - CORS: localhost:3000
   - Health check: HTTP /api/health

4. **frontend (React + Vite)**
   - Puerto: 3000
   - Depende de: api-gateway
   - Build: Multi-stage (dev/prod)
   - Health check: HTTP /

### 10.3 Comandos Útiles

**Gestión básica:**
```bash
# Iniciar todos los servicios
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker logs delivereats-auth-service -f
docker logs delivereats-api-gateway -f
docker logs delivereats-frontend -f

# Reiniciar un servicio
docker compose restart auth-service

# Detener todo
docker compose down

# Reset completo (elimina volúmenes)
docker compose down -v
docker compose up --build -d
```

**Debugging:**
```bash
# Entrar al contenedor auth-service
docker exec -it delivereats-auth-service sh

# Ejecutar consultas SQL directamente
docker exec delivereats-auth-db mysql -uroot -ppassword \
  -e "SELECT * FROM auth_db.users;"

# Ver variables de entorno
docker exec delivereats-auth-service env | grep JWT

# Ver estado de los servicios
docker compose ps

# Inspeccionar red
docker network inspect delivereats_delivereats-network
```

**Monitoreo:**
```bash
# Uso de recursos
docker stats

# Health checks
docker inspect delivereats-auth-service | grep -A 5 Health
```

---

## 11. Troubleshooting

### 11.1 Problemas Comunes

#### Login falla con "Invalid credentials"

**Diagnóstico:**
```bash
# Verificar contraseñas en BD
docker exec delivereats-auth-db mysql -uroot -ppassword -e \
  "SELECT id, email, LEFT(password,30) as pwd_hash FROM auth_db.users;"

# Verificar formato de hash (debe ser $2a$12$...)
```

**Solución:**
- Asegurar que las contraseñas usen formato `$2a$` (no `$2b$`)
- Verificar que bcryptjs esté instalado (no bcrypt nativo)

#### Frontend no se conecta al API Gateway

**Diagnóstico:**
```bash
# Verificar CORS en api-gateway
docker logs delivereats-api-gateway | grep CORS

# Verificar que el frontend apunte a puerto correcto
# frontend/src/services/api.js debe tener:
# baseURL: 'http://localhost:8080/api'
```

**Solución:**
```javascript
// api-gateway/src/index.js
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
```

#### gRPC error: "UNAVAILABLE: failed to connect"

**Diagnóstico:**
```bash
# Verificar que auth-service esté corriendo
docker compose ps

# Verificar puerto 50051
docker exec delivereats-api-gateway nc -zv auth-service 50051
```

**Solución:**
- Esperar a que auth-service termine health check
- Verificar `depends_on` en docker-compose.yml
- Revisar logs: `docker logs delivereats-auth-service`

#### Base de datos no inicializa

**Diagnóstico:**
```bash
# Ver logs de MySQL
docker logs delivereats-auth-db

# Verificar que existe auth_db
docker exec delivereats-auth-db mysql -uroot -ppassword -e "SHOW DATABASES;"
```

**Solución:**
```bash
# Recrear volumen
docker compose down -v
docker compose up -d
```

### 11.2 Verificación del Sistema

**Checklist completo:**
```bash
# 1. Todos los contenedores corriendo
docker compose ps
# Esperado: 4 servicios "Up"

# 2. Base de datos inicializada
docker exec delivereats-auth-db mysql -uroot -ppassword \
  -e "SELECT COUNT(*) FROM auth_db.users;"
# Esperado: 4 usuarios

# 3. gRPC funcional
docker logs delivereats-auth-service --tail 20
# Buscar: "gRPC server running on 0.0.0.0:50051"

# 4. API Gateway funcional
curl http://localhost:8080/api/health
# Esperado: {"status":"OK",...}

# 5. Frontend accesible
curl http://localhost:3000
# Esperado: HTML de React

# 6. Login funcional
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delivereats.com","password":"admin123"}'
# Esperado: {"success":true, "data":{"user":{...},"token":"..."}}
```

---

## 12. Casos de Uso del Negocio (CDU)

### 12.1 CDU Alto Nivel – Core del Negocio

**Core del negocio:** DeliverEats habilita la gestión integral del proceso de delivery de alimentos, garantizando la creación, preparación, despacho y entrega de órdenes, asegurando trazabilidad, control de estados y continuidad operativa.

![CDU Alto Nivel](../Practica1/src/3.1.png)

**CDU implementados en Práctica 2:**
-**CDU-01 Gestionar Usuarios** (completo)

**CDU futuros:**
- CDU-02 Gestionar Catálogo
- CDU-03 Gestionar Órdenes
- CDU-04 Gestionar Entregas
- CDU-05 Gestionar Administración

### 12.1.1 Primera Descomposición del Core

![Primera Descomposición](../Practica1/src/3.2.png)

### 12.1.2 CDU Expandidos - Vista General

![CDU Expandidos](../Practica1/src/3.3.png)

### 12.2 CDU-01 Gestionar Usuarios (Implementado)

**Actor(es):**
Cliente, Restaurante, Repartidor, Administrador

**Propósito:**
Permitir el registro, autenticación y control de acceso de los usuarios del sistema, asegurando que cada actor opere únicamente dentro de las funcionalidades correspondientes a su rol.

**Resumen:**
El usuario se registra y se autentica en el sistema. El sistema valida las credenciales, identifica el rol asignado y habilita el acceso a los procesos de la operación de delivery.

![CDU-01 Gestionar Usuarios](../Practica1/src/3.3.1.png)

#### Curso Normal de Eventos

1.El usuario solicita registrarse en el sistema
2.El sistema valida la información ingresada
3.El sistema registra al usuario y asigna un rol
4.El usuario inicia sesión
5.El sistema autentica al usuario mediante JWT
6.El sistema verifica el estado activo del usuario
7.El sistema habilita el acceso según rol

#### Cursos Alternos

***Datos inválidos:** El sistema notifica errores de validación
***Credenciales incorrectas:** El sistema rechaza la autenticación
***Usuario inactivo:** El sistema muestra mensaje específico con contacto de administrador
***Token expirado:** El sistema solicita nuevo login
***Acceso no autorizado:** El sistema retorna 403 Forbidden

**Precondición:**
El usuario no está autenticado (o su token expiró).

**Postcondición:**
El usuario queda autenticado con JWT válido y habilitado según su rol.

#### Funcionalidades de Admin (CDU-01 extendido)

1.Ver listado completo de usuarios
2.Crear usuarios con cualquier rol
3.Editar información de usuarios
4.Cambiar roles de usuarios
5.Activar/Desactivar usuarios
6.Eliminar usuarios permanentemente
7.Ver estadísticas de usuarios por rol

### 12.3 CDU Futuros (Práctica 1 - Para Implementación Futura)

#### 12.3.1 CDU-02 Gestionar Catálogo

**Estado:** Pendiente de implementación

![CDU-02 Gestionar Catálogo](../Practica1/src/3.3.2.png)

**Actor(es):** Restaurante, Administrador  
**Propósito:** Administrar la información operativa de restaurantes y productos necesarios para la creación de órdenes.

---

#### 12.3.2 CDU-03 Gestionar Órdenes

**Estado:** Pendiente de implementación

![CDU-03 Gestionar Órdenes](../Practica1/src/3.3.3.png)

**Actor(es):** Cliente, Restaurante  
**Propósito:** Permitir la creación, gestión y control del ciclo de vida de una orden de delivery.

---

#### 12.3.3 CDU-04 Gestionar Entregas

**Estado:** Pendiente de implementación

![CDU-04 Gestionar Entregas](../Practica1/src/3.3.4.png)

**Actor(es):** Repartidor  
**Propósito:** Coordinar y dar seguimiento al proceso de entrega de una orden.

---

#### 12.3.4 CDU-05 Gestionar Administración

**Estado:** Pendiente de implementación

![CDU-05 Gestionar Administración](../Practica1/src/3.3.5.png)

**Actor(es):** Administrador  
**Propósito:** Supervisar la operación general del sistema y administrar roles y configuraciones básicas.

---

## 13. Modelo de Datos

### 13.1 Esquema de Base de Datos

**Base de datos:** `auth_db`
**Motor:** MySQL 8.0
**Charset:** utf8mb4

#### 13.1.1 Tabla: roles

```sql
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Datos iniciales:**
| id | name | Descripción |
|----|------|-------------|
| 1 | ADMIN | Administrador con acceso completo |
| 2 | CLIENTE | Usuario que realiza pedidos |
| 3 | RESTAURANTE | Administra menú y acepta órdenes |
| 4 | REPARTIDOR | Realiza entregas |

#### 13.1.2 Tabla: users

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_email (email),
  INDEX idx_role_id (role_id),
  INDEX idx_is_active (is_active)
);
```

**Campos:**
- `id`: Identificador único auto-incremental
- `name`: Nombre completo del usuario
- `email`: Correo electrónico único (usado para login)
- `password`: Hash bcrypt de la contraseña ($2a$12$...)
- `role_id`: FK a tabla roles
- `is_active`: Flag para soft delete/activación
- `created_at`: Timestamp de creación
- `updated_at`: Timestamp de última modificación

**Índices:**
- `PRIMARY KEY (id)`: Acceso directo por ID
- `UNIQUE (email)`: Previene duplicados y optimiza login
- `INDEX (role_id)`: Optimiza filtros por rol
- `INDEX (is_active)`: Optimiza filtros de usuarios activos

### 13.2 Diagrama Entidad-Relación

**Modelo extendido (para referencia con Práctica 1):**

![Diagrama ER Base 1](../Practica1/src/er.png)
![Diagrama ER Base 2](../Practica1/src/er2.png)

### 13.3 Datos de Ejemplo (Seeds)

```sql
-- Roles
INSERT INTO roles (name) VALUES 
  ('ADMIN'),
  ('CLIENTE'),
  ('RESTAURANTE'),
  ('REPARTIDOR');

-- Usuarios de prueba
INSERT INTO users (name, email, password, role_id) VALUES
  ('Administrator', 'admin@delivereats.com', '$2a$12$...', 1),
  ('Test Cliente', 'cliente@test.com', '$2a$12$...', 2),
  ('Test Restaurant', 'restaurant@test.com', '$2a$12$...', 3),
  ('Test Delivery', 'delivery@test.com', '$2a$12$...', 4);
```

---

## 14. Estructura del Proyecto

```
Practica2/
├── api-gateway/
│   ├── src/
│   │   ├── index.js              # Servidor Express principal
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT validation middleware
│   │   │   └── errorHandler.js  # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.js           # Rutas de autenticación
│   │   │   ├── catalog.js        # Rutas de catálogo (futuro)
│   │   │   ├── delivery.js       # Rutas de entregas (futuro)
│   │   │   ├── health.js         # Health check
│   │   │   └── orders.js         # Rutas de órdenes (futuro)
│   │   ├── services/
│   │   │   └── authService.js    # Cliente gRPC para auth-service
│   │   └── utils/
│   │       └── logger.js         # Winston logger
│   ├── Dockerfile
│   └── package.json
│
├── auth-service/
│   ├── src/
│   │   ├── index.js              # Servidor gRPC
│   │   ├── config/
│   │   │   └── database.js       # MySQL connection pool
│   │   ├── controllers/
│   │   │   └── authController.js # Lógica de negocio
│   │   └── utils/
│   │       └── logger.js         # Winston logger
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Componente raíz con routing
│   │   ├── main.jsx              # Entry point
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Barra de navegación
│   │   │   ├── ProtectedRoute.jsx # HOC para rutas protegidas
│   │   │   └── RegisterUserForm.jsx # Formulario de registro (admin)
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page
│   │   │   ├── Login.jsx         # Página de login
│   │   │   ├── Register.jsx      # Página de registro
│   │   │   ├── Unauthorized.jsx  # 403 page
│   │   │   └── dashboards/
│   │   │       ├── AdminDashboard.jsx    # Dashboard admin
│   │   │       └── ClientDashboard.jsx   # Dashboard cliente
│   │   ├── services/
│   │   │   └── api.js            # Axios instance configurado
│   │   └── stores/
│   │       └── authStore.js      # Zustand store con persist
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── protos/
│   └── auth.proto                # Protocol Buffers contract
│
├── db/
│   └── auth_db.sql               # Script de inicialización DB
│
├── docker-compose.yml            # Orquestación de servicios
└── README.md                     # Esta documentación
```

---

## 15. Requisitos Cumplidos - Rúbrica

### Práctica 2 - Sistema de Autenticación

| Criterio | Puntos | Estado | Evidencia |
|----------|--------|--------|-----------|
| **Interfaz funcional** | 5 | Bien | Frontend React con login, registro, dashboards |
| **Formularios de registro** | 5 | Bien | Registro público + admin con validación |
| **Login con JWT persistente** | 10 | Bien | JWT en Zustand + localStorage, válido 24h |
| **Contraseñas encriptadas** | 10 | Bien | Bcrypt 12 rounds, formato $2a$ |
| **Generación JWT correcta** | 10 | Bien | HS256, payload {id,email,role,name}, exp 24h |
| **Manejo de errores** | 5 | Bien | Toast notifications + error boundaries |
| **API Gateway funcional** | 5 | Bien | Express con middleware stack completo |
| **Comunicación gRPC** | 10 | Bien | Gateway ↔ Auth Service con Protocol Buffers |
| **Contenedores Docker** | 5 | Bien | 4 servicios con docker-compose.yml |
| **Principios SOLID** | 20 | Bien | Separación de capas, DI, SRP aplicados |
| **Documentación** | 5 | Bien | README completo con justificaciones |
| **EXTRA: Admin Dashboard** | +10 | Bien | CRUD completo de usuarios con estadísticas |
| **EXTRA: Activar/Desactivar** | +5 | Bien | Soft delete + mensaje personalizado |
| **EXTRA: Health checks** | +5 | Bien | Todos los servicios con health endpoints |

**Total:** 90 pts base + 20 pts extras = **110/90 pts** 

---

## 16. Mejoras Futuras

### 16.1 Corto Plazo
- [ ] Refresh tokens (RT) para sesiones extendidas
- [ ] Rate limiting por usuario (no solo global)
- [ ] Password reset via email
- [ ] 2FA (autenticación de dos factores)
- [ ] Logs centralizados (ELK Stack)

### 16.2 Mediano Plazo
- [ ] Implementar CDU-02: Gestionar Catálogo
- [ ] Implementar CDU-03: Gestionar Órdenes
- [ ] Implementar CDU-04: Gestionar Entregas
- [ ] WebSockets para notificaciones en tiempo real
- [ ] GraphQL API como alternativa a REST

### 16.3 Largo Plazo
- [ ] Migración a Kubernetes
- [ ] Service mesh (Istio)
- [ ] Distributed tracing (Jaeger)
- [ ] CI/CD completo (GitHub Actions)
- [ ] Monitoreo con Prometheus + Grafana

---

## 17. Referencias Técnicas

### Documentación Oficial
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)
- [JWT.io](https://jwt.io/)
- [Bcrypt](https://www.npmjs.com/package/bcryptjs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### Arquitectura
- [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/index.html)
- [The Twelve-Factor App](https://12factor.net/)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

## Inicio Rápido (TL;DR)

```bash
# Desde WSL
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose up -d

# Acceder
# Frontend: http://localhost:3000
# API: http://localhost:8080/api
```

**Login de prueba:** admin@delivereats.com / admin123

---

**Versión:** 0.2.0 | **Fecha:** Febrero 2026 | **Curso:** Software Avanzado  
**Autor:** Pablo Fernández | **Práctica:** Autenticación JWT + gRPC + Microservicios

---
---
---
---
---
---
---
---
---

# Software Avanzado – Práctica 3

## DeliverEats — Plataforma de Delivery con Arquitectura SOA

Sistema completo de gestión de delivery de alimentos mediante una arquitectura orientada a servicios (SOA) con 4 microservicios, 4 bases de datos aisladas, comunicación REST + gRPC, autenticación JWT y frontend React.

---

## Índice

1. [Contexto](#1-contexto)
2. [Objetivos](#2-objetivos)
3. [Arquitectura General](#3-arquitectura-general)
4. [Microservicios](#4-microservicios)
5. [Comunicación entre Servicios](#5-comunicación-entre-servicios)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Autenticación y Seguridad](#7-autenticación-y-seguridad)
8. [Frontend](#8-frontend)
9. [API Endpoints](#9-api-endpoints)
10. [Despliegue con Docker](#10-despliegue-con-docker)
11. [Inicio Rápido](#11-inicio-rápido)
12. [Casos de Uso](#12-casos-de-uso)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Contexto

DeliverEats es una plataforma de delivery que coordina el ciclo completo de pedidos de alimentos. La **Práctica 3** implementa la arquitectura SOA completa con los 4 servicios del dominio del negocio:

| Servicio | Responsabilidad |
|----------|----------------|
| **Auth Service** | Registro, login, JWT, gestión de usuarios y roles |
| **Catalog Service** | Restaurantes, menús, inventario de items |
| **Orders Service** | Creación, validación y ciclo de vida de órdenes |
| **Delivery Service** | Asignación y seguimiento de entregas |

---

## 2. Objetivos

### 2.1 Objetivo General
Implementar un sistema funcional de delivery de alimentos con arquitectura SOA, aplicando aislamiento de persistencia, comunicación inter-servicios (REST + gRPC), y control de acceso por roles.

### 2.2 Objetivos Específicos
- Implementar 4 microservicios con bases de datos independientes
- Comunicación REST (Frontend ↔ Gateway) y gRPC (inter-servicios)
- Autenticación JWT con RBAC (4 roles)
- Validación de órdenes con gRPC entre orders-service y catalog-service
- Dashboards diferenciados por rol (Admin, Cliente, Restaurante)
- Gestión de menú, inventario y órdenes recibidas para restaurantes
- Despliegue containerizado completo con Docker Compose

---

## 3. Arquitectura General

### 3.1 Diagrama de Arquitectura de Alto Nivel

![CDU Alto Nivel](./src/3.1.png)

### 3.2 Diagrama de Componentes

![CDU Alto Nivel](./src/3.2.png)

### 3.3 Diagrama de Despliegue (Docker)

![CDU Alto Nivel](./src/3.3.png)

---

## 4. Microservicios

### 4.1 Auth Service (gRPC :50051)

**Tecnología:** Node.js + gRPC  
**Base de datos:** `auth_db` (MySQL :3306)  
**Contrato:** `protos/auth.proto`

**Operaciones gRPC:**

| RPC | Descripción |
|-----|-------------|
| `Register` | Registrar nuevo usuario con rol |
| `Login` | Autenticación, devuelve JWT |
| `ValidateToken` | Verificar y decodificar JWT |
| `GetAllUsers` | Obtener listado de usuarios |
| `GetUserById` | Obtener usuario por ID |
| `UpdateUser` | Actualizar nombre/email |
| `UpdateUserRole` | Cambiar rol de usuario |
| `DeleteUser` | Eliminar usuario |

**Seguridad:** bcrypt 12 rounds, JWT HS256 con expiración 24h.

### 4.2 Catalog Service (REST :3002 + gRPC :50052)

**Tecnología:** Node.js + Express + gRPC  
**Base de datos:** `catalog_db` (MySQL :3307)  
**Contrato gRPC:** `protos/catalog.proto`

**REST — Restaurantes:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/restaurants` | Listar restaurantes |
| GET | `/api/restaurants/:id` | Obtener restaurante con menú |
| GET | `/api/restaurants/owner/:ownerId` | Restaurantes por dueño |
| POST | `/api/restaurants` | Crear restaurante |
| PUT | `/api/restaurants/:id` | Actualizar restaurante |
| DELETE | `/api/restaurants/:id` | Desactivar restaurante |
| PATCH | `/api/restaurants/:id/toggle` | Activar/desactivar |

**REST — Menu Items:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/menu-items` | Todos los items |
| GET | `/api/menu-items/restaurant/:id` | Items por restaurante (`?all=true` incluye no disponibles) |
| GET | `/api/menu-items/:id` | Item por ID |
| POST | `/api/menu-items` | Crear item |
| PUT | `/api/menu-items/:id` | Actualizar item |
| DELETE | `/api/menu-items/:id` | Eliminar item |
| PATCH | `/api/menu-items/:id/toggle` | Activar/desactivar |

**gRPC — Validación de órdenes:**

```protobuf
service CatalogService {
  rpc ValidateOrderItems(ValidationRequest) returns (ValidationResponse);
}
```

Valida existencia, pertenencia al restaurante, precio y disponibilidad de items antes de crear una orden.

### 4.3 Orders Service (REST :3003)

**Tecnología:** Node.js + Express  
**Base de datos:** `orders_db` (MySQL :3308)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/orders` | Todas las órdenes |
| GET | `/api/orders/:id` | Orden por ID |
| GET | `/api/orders/user/:userId` | Órdenes por cliente |
| GET | `/api/orders/restaurant/:id` | Órdenes por restaurante |
| POST | `/api/orders` | Crear orden (valida por gRPC con Catalog) |
| PATCH | `/api/orders/:id/status` | Cambiar estado de orden |
| POST | `/api/orders/:id/cancel` | Cancelar orden |

**Estados de orden:** `CREADA` → `EN_PROCESO` → `FINALIZADA` | `RECHAZADA`

### 4.4 Delivery Service (REST :3004)

**Tecnología:** Node.js + Express  
**Base de datos:** `delivery_db` (MySQL :3309)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/deliveries` | Todas las entregas |
| GET | `/api/deliveries/:id` | Entrega por ID |
| GET | `/api/deliveries/courier/:id` | Entregas por repartidor |
| GET | `/api/deliveries/order/:id` | Entrega por orden |
| POST | `/api/deliveries` | Crear entrega |
| POST | `/api/deliveries/:id/start` | Iniciar entrega |
| POST | `/api/deliveries/:id/complete` | Completar entrega |
| POST | `/api/deliveries/:id/cancel` | Cancelar entrega |

**Estados de entrega:** `ASIGNADO` → `EN_CAMINO` → `ENTREGADO` | `CANCELADO`

---

## 5. Comunicación entre Servicios

### 5.1 Diagrama de Secuencia — Crear Orden

![CDU Alto Nivel](./src/5.1.png)

### 5.2 Diagrama de Secuencia — Login

![CDU Alto Nivel](./src/5.2.png)

### 5.3 Diagrama de Secuencia — Registro de Restaurante

![CDU Alto Nivel](./src/5.3.png)

### 5.4 Diagrama de Actividades — Ciclo de Vida de una Orden

![CDU Alto Nivel](./src/5.png)


### 5.5 Protocolos de Comunicación

| Origen | Destino | Protocolo | Formato | Puerto |
|--------|---------|-----------|---------|--------|
| Frontend | API Gateway | REST/HTTP | JSON | 8080 |
| API Gateway | Auth Service | gRPC/HTTP2 | Protobuf | 50051 |
| API Gateway | Catalog Service | REST/HTTP | JSON | 3002 |
| API Gateway | Orders Service | REST/HTTP | JSON | 3003 |
| API Gateway | Delivery Service | REST/HTTP | JSON | 3004 |
| Orders Service | Catalog Service | gRPC/HTTP2 | Protobuf | 50052 |

---

## 6. Modelo de Datos

### 6.1 Diagrama Entidad-Relación

![CDU Alto Nivel](./src/6.1.png)

### 6.2 Aislamiento de Persistencia

Cada microservicio posee su propia base de datos MySQL. **No existen foreign keys entre bases de datos**, sino referencias lógicas por ID externo. Esto garantiza:

- Despliegue y escalado independiente por servicio
- Cada servicio puede evolucionar o migrar su esquema sin afectar los demás
- Los datos de un servicio solo son accesibles a través de su API

### 6.3 Diagrama de Estados

**Orden:**

![CDU Alto Nivel](./src/6.3.png)

## 7. Autenticación y Seguridad

### 7.1 Flujo JWT

![CDU Alto Nivel](./src/7.1.png)


### 7.2 Configuraciones de Seguridad

| Aspecto | Implementación |
|---------|---------------|
| Hash de contraseñas | bcrypt, 12 rounds, formato `$2a$` |
| JWT | HS256, expiración 24h |
| Rate Limiting | 100 req / 15 min por IP |
| Headers HTTP | Helmet.js |
| CORS | Configurado para `localhost:3000` |
| SQL Injection | Prepared statements en todas las queries |
| Roles (RBAC) | ADMIN, CLIENTE, RESTAURANTE, REPARTIDOR |

### 7.3 Payload JWT

```json
{
  "id": 1,
  "email": "admin@delivereats.com",
  "role": "ADMIN",
  "name": "Administrator",
  "iat": 1738656000,
  "exp": 1738742400
}
```

### 7.4 Contrato gRPC Auth (`auth.proto`)

```protobuf
service AuthService {
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetUserById(GetUserByIdRequest) returns (GetUserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (GetUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);
  rpc GetAllUsers(GetAllUsersRequest) returns (GetAllUsersResponse);
  rpc UpdateUserRole(UpdateUserRoleRequest) returns (GetUserResponse);
}
```

### 7.5 Contrato gRPC Catalog (`catalog.proto`)

```protobuf
service CatalogService {
  rpc ValidateOrderItems(ValidationRequest) returns (ValidationResponse);
}

message ValidationRequest {
  int32                     restaurant_id = 1;
  repeated OrderItemRequest items         = 2;
}

message ValidationResponse {
  bool                          valid            = 1;
  string                        message          = 2;
  repeated ItemValidationResult item_results     = 3;
  double                        total_calculated = 4;
  string                        restaurant_name  = 5;
  string                        restaurant_address = 6;
}
```

---

## 8. Frontend

### 8.1 Stack Tecnológico

| Tecnología | Justificación |
|-----------|---------------|
| React 18 | Component-based, Virtual DOM |
| Vite | HMR ≈50ms, build 10-100x más rápido que CRA |
| Tailwind CSS | Utility-first, PurgeCSS ≈10KB producción |
| Zustand | Store 1KB vs Redux 8KB, sin boilerplate |
| React Router v6 | Routing declarativo, rutas protegidas |
| Axios | Interceptores JWT automáticos |
| Heroicons | Iconografía SVG consistente |

### 8.2 Estructura de Páginas

```
frontend/src/
├── App.jsx                     # Routing + ProtectedRoute
├── main.jsx                    # Entry point
├── components/
│   ├── Navbar.jsx              # Navegación diferenciada por rol
│   └── RegisterUserForm.jsx    # Modal de registro (admin)
├── pages/
│   ├── Home.jsx                # Lista restaurantes (clientes) / redirige restaurantes
│   ├── Login.jsx               # Autenticación
│   ├── Register.jsx            # Registro público
│   ├── RestaurantMenu.jsx      # Menú de un restaurante + carrito
│   ├── MyOrders.jsx            # Historial de órdenes (cliente)
│   ├── ClientDashboard.jsx     # Dashboard del cliente
│   ├── RestaurantDashboard.jsx # Dashboard del restaurante
│   ├── AdminPanel.jsx          # Panel admin general
│   └── AdminDashboard.jsx      # Gestión usuarios (admin)
├── services/
│   └── api.js                  # Axios configurado con interceptores
└── stores/
    └── authStore.js            # Zustand + persist middleware
```

### 8.3 Dashboards por Rol

| Rol | Dashboard | Funcionalidades |
|-----|-----------|----------------|
| **ADMIN** | `/admin`, `/admin/users` | CRUD usuarios, estadísticas por rol, registrar cualquier rol |
| **CLIENTE** | `/dashboard`, `/my-orders` | Ver restaurantes, hacer pedidos, historial, estadísticas de gasto |
| **RESTAURANTE** | `/restaurant-dashboard` | Gestión de menú (CRUD items), control de inventario/stock, ver órdenes recibidas, estadísticas |
| **REPARTIDOR** | *(en desarrollo)* | Entregas asignadas, iniciar/completar entregas |

### 8.4 Navegación por Rol

![CDU Alto Nivel](./src/8.4.png)

---

## 9. API Endpoints

### 9.1 Rutas Públicas

#### POST `/api/auth/register`
```json
// Request
{ "name": "Juan", "email": "juan@test.com", "password": "pass123", "role": "CLIENTE" }
// Response 201
{ "success": true, "data": { "user": {...}, "token": "eyJ..." } }
```

#### POST `/api/auth/login`
```json
// Request
{ "email": "admin@delivereats.com", "password": "admin123" }
// Response 200
{ "success": true, "data": { "user": { "id": 1, "name": "Administrator", "role": "ADMIN" }, "token": "eyJ..." } }
```

#### GET `/api/catalog/restaurants`
```json
// Response 200
{ "success": true, "data": [{ "id": 1, "name": "Burger Palace", "address": "...", "isActive": true }] }
```

### 9.2 Rutas Protegidas (requieren `Authorization: Bearer <token>`)

| Grupo | Método | Ruta | Roles |
|-------|--------|------|-------|
| **Auth** | GET | `/api/auth/users` | ADMIN |
| | POST | `/api/auth/admin/register` | ADMIN |
| | PUT | `/api/auth/users/:id` | ADMIN |
| | PUT | `/api/auth/users/:id/role` | ADMIN |
| | DELETE | `/api/auth/users/:id` | ADMIN |
| **Catalog** | POST | `/api/catalog/restaurants` | RESTAURANTE, ADMIN |
| | PUT | `/api/catalog/restaurants/:id` | RESTAURANTE, ADMIN |
| | POST | `/api/catalog/menu-items` | RESTAURANTE, ADMIN |
| | PUT | `/api/catalog/menu-items/:id` | RESTAURANTE, ADMIN |
| | DELETE | `/api/catalog/menu-items/:id` | RESTAURANTE, ADMIN |
| | PATCH | `/api/catalog/menu-items/:id/toggle` | RESTAURANTE, ADMIN |
| **Orders** | POST | `/api/orders` | CLIENTE, ADMIN |
| | PATCH | `/api/orders/:id/status` | Autenticado |
| | POST | `/api/orders/:id/cancel` | Autenticado |
| **Delivery** | GET | `/api/delivery` | REPARTIDOR, ADMIN |
| | POST | `/api/delivery/:id/start` | REPARTIDOR, ADMIN |
| | POST | `/api/delivery/:id/complete` | REPARTIDOR, ADMIN |

---

## 10. Despliegue con Docker

### 10.1 Servicios (11 contenedores)

```
┌─────────────────────────────────────────────────────────────────┐
│                    delivereats-network (bridge)                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ auth-db  │  │catalog-db│  │orders-db │  │delivery- │       │
│  │  :3306   │  │  :3307   │  │  :3308   │  │ db :3309 │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐       │
│  │  auth-   │  │ catalog- │  │ orders-  │  │delivery- │       │
│  │ service  │  │ service  │  │ service  │  │ service  │       │
│  │  :50051  │  │:3002/:52 │  │  :3003   │  │  :3004   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────┬───────┴──────┬───────┘              │             │
│              │              │                      │             │
│         ┌────┴──────────────┴──────────────────────┴─────┐      │
│         │              api-gateway :8080                  │      │
│         └────────────────────┬────────────────────────────┘      │
│                              │                                   │
│         ┌────────────────────┴────────────────────────────┐      │
│         │              frontend :3000                     │      │
│         └─────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Volúmenes Persistentes

| Volumen | Base de datos | Contenido |
|---------|------------|-----------|
| `delivereats_auth_db_data` | auth_db | Usuarios y roles |
| `delivereats_catalog_db_data` | catalog_db | Restaurantes y menús |
| `delivereats_orders_db_data` | orders_db | Órdenes e items |
| `delivereats_delivery_db_data` | delivery_db | Entregas |

### 10.3 Comandos de Gestión

```bash
# Levantar todo
docker compose up -d

# Ver estado de todos los servicios
docker compose ps

# Logs en tiempo real
docker compose logs -f

# Logs de un servicio específico
docker logs delivereats-api-gateway -f
docker logs delivereats-catalog-service -f

# Reiniciar un servicio
docker compose restart catalog-service

# Reset completo (elimina datos)
docker compose down -v
docker compose up --build -d

# Consultar BD directamente
docker exec delivereats-catalog-db mysql -uroot -ppassword \
  -e "SELECT * FROM catalog_db.restaurants;"

docker exec delivereats-auth-db mysql -uroot -ppassword \
  -e "SELECT id, name, email FROM auth_db.users;"
```

---

## 11. Inicio Rápido

### 11.1 Requisitos Previos
- Docker y Docker Compose
- Puertos disponibles: 3000, 3002-3004, 3306-3309, 8080, 50051-50052

### 11.2 Despliegue

```bash
cd Practica3
docker compose up -d
```

Esperar ~60 segundos a que todos los health checks pasen:

```bash
docker compose ps
# Todos deben mostrar "healthy"
```

### 11.3 Acceso

| Recurso | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080/api |
| Health Check | http://localhost:8080/api/health |

### 11.4 Usuarios de Prueba

| Email | Password | Rol |
|-------|----------|-----|
| `admin@delivereats.com` | `admin123` | ADMIN |
| `cliente@test.com` | `admin123` | CLIENTE |
| `restaurant@test.com` | `admin123` | RESTAURANTE |
| `delivery@test.com` | `admin123` | REPARTIDOR |

---

## 12. Casos de Uso

### 12.1 CDU de Alto Nivel

![CDU Alto Nivel](./src/12.1.png)

### 12.2 CDU-01: Gestionar Usuarios

**Actor(es):** Todos  
**Servicio:** Auth Service + API Gateway

![CDU Alto Nivel](./src/12.2.png)

**Curso normal:**
1. El usuario se registra proporcionando nombre, email, password y rol
2. El sistema valida datos y hashea la contraseña (bcrypt 12 rounds)
3. El sistema genera JWT con `{id, email, role, name}` y expiración 24h
4. El frontend almacena token en Zustand + localStorage
5. Cada petición incluye `Authorization: Bearer <token>`
6. El API Gateway verifica el token antes de reenviar la petición

**Cursos alternos:**
- Datos inválidos → 400 con errores de validación
- Email duplicado → 400 "User already exists"
- Credenciales incorrectas → 401 "Invalid credentials"
- Usuario inactivo → 403 con mensaje de contactar administrador
- Token expirado → 401, frontend redirige a login

### 12.3 CDU-02: Gestionar Catálogo

**Actor(es):** Restaurante, Admin  
**Servicio:** Catalog Service

![CDU Alto Nivel](./src/12.3.png)

### 12.4 CDU-03: Gestionar Órdenes

**Actor(es):** Cliente, Restaurante  
**Servicio:** Orders Service (+ gRPC a Catalog)

![CDU Alto Nivel](./src/12.4.png)

### 12.5 CDU-04: Gestionar Entregas

**Actor(es):** Repartidor, Admin  
**Servicio:** Delivery Service

![CDU Alto Nivel](./src/12.5.png)

---

## 13. Troubleshooting

### "No tienes un restaurante asignado"
Al registrar un usuario RESTAURANTE desde el panel admin, el sistema crea automáticamente un restaurante asociado. Si falló, el propio dashboard ofrece un botón "Crear Restaurante".

### Login falla con "Invalid credentials"
```bash
docker exec delivereats-auth-db mysql -uroot -ppassword \
  -e "SELECT id, email FROM auth_db.users;"
```
Si la tabla está vacía: `docker compose down -v && docker compose up -d`

### Orden falla al crear
La validación gRPC verifica: existencia del item, pertenencia al restaurante, precio correcto, y disponibilidad. Revisar:
```bash
docker logs delivereats-orders-service -f
docker logs delivereats-catalog-service -f
```

### Frontend no conecta
```bash
curl http://localhost:8080/api/health
```
Si falla, verificar que todos los contenedores estén healthy: `docker compose ps`

---

## Estructura del Proyecto

```
Practica3/
├── docker-compose.yml           # Orquestación: 11 contenedores
├── protos/
│   ├── auth.proto               # Contrato gRPC Auth
│   └── catalog.proto            # Contrato gRPC Catalog (validación de órdenes)
├── db/
│   ├── auth_db.sql              # Schema + seeds auth
│   ├── catalog_db.sql           # Schema + seeds catálogo
│   ├── orders_db.sql            # Schema órdenes
│   └── delivery_db.sql          # Schema entregas
├── api-gateway/                 # Express proxy :8080
│   └── src/
│       ├── middleware/ (auth.js, errorHandler.js)
│       ├── routes/ (auth, catalog, orders, delivery, health)
│       ├── services/ (authService.js — gRPC client)
│       └── utils/ (logger.js)
├── auth-service/                # gRPC server :50051
│   └── src/
│       ├── controllers/ (authController.js)
│       ├── models/ (User.js, Role.js)
│       └── config/ (database.js)
├── catalog-service/             # REST :3002 + gRPC :50052
│   └── src/
│       ├── controllers/ (restaurantController, menuItemController)
│       ├── models/ (Restaurant.js, MenuItem.js)
│       ├── routes/ (restaurants.js, menuItems.js)
│       └── grpc/ (catalogGrpcServer.js)
├── orders-service/              # REST :3003
│   └── src/
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       └── grpc/ (catalogClient — gRPC client to catalog)
├── delivery-service/            # REST :3004
│   └── src/
│       ├── controllers/ (deliveryController)
│       ├── models/ (Delivery.js)
│       └── routes/ (deliveries.js)
└── frontend/                    # React + Vite :3000
    └── src/
        ├── App.jsx
        ├── components/ (Navbar, RegisterUserForm)
        ├── pages/ (Home, Login, Register, RestaurantMenu,
        │           MyOrders, ClientDashboard, RestaurantDashboard,
        │           AdminPanel, AdminDashboard)
        ├── services/ (api.js)
        └── stores/ (authStore.js)
```

---

**Versión:** 0.3.0 | **Fecha:** Febrero 2026 | **Curso:** Software Avanzado  
**Práctica:** 3 — Arquitectura SOA Completa con Microservicios

---

## 16. Práctica 5: FX-Service, Pagos y Evidencia

### 16.1 Arquitectura General (Práctica 5)

```
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Frontend   │────>│  API Gateway  │────>│ Payment-Service │────>│  FX-Service  │
│  (React)     │     │  (:8080)      │     │   (:3006)       │     │ (:5000/gRPC) │
└─────────────┘     └───────────────┘     └─────────────────┘     └──────┬───────┘
                           │                       │                      │
                           │                       v                      v
                    ┌──────┴──────┐         ┌────────────┐         ┌──────────┐
                    │ Orders-Svc  │         │ Payment-DB │         │  Redis   │
                    │  (:3003)    │         │  (:3310)   │         │ (Cache)  │
                    └─────────────┘         └────────────┘         └──────────┘
                           │                                            │
                    ┌──────┴──────┐                              ┌──────┴──────┐
                    │Delivery-Svc │                              │ExchangeRate │
                    │  (:3004)    │                              │   API       │
                    └─────────────┘                              │ (External)  │
                           │                                     └─────────────┘
                    ┌──────┴──────┐
                    │Delivery-DB  │
                    │  (:3309)    │
                    │ +photo_evidence
                    │ +failure_reason
                    └─────────────┘
```

### 16.2 FX-Service — Estrategia de Caché

```
┌─────────────────────────────────────────────────────────┐
│                  GET /api/fx/rate?from=USD&to=GTQ        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       v
              ┌─────────────────┐
              │  Redis Cache    │  TTL: 6 minutos
              │  (Level 1)      │
              └───────┬─────────┘
                      │ MISS
                      v
              ┌─────────────────┐
              │  ExchangeRate   │  API externa
              │  API (Level 2)  │  open.er-api.com
              └───────┬─────────┘
                      │ ERROR
                      v
              ┌─────────────────┐
              │  Redis Fallback │  TTL: 24 horas
              │  (Level 3)      │  Última tasa conocida
              └─────────────────┘
```

### 16.3 Nuevos Endpoints (Práctica 5)

#### FX-Service (vía API Gateway `/api/fx/`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/fx/rate?from=USD&to=GTQ` | Obtener tasa de cambio |
| GET | `/api/fx/rates?base=USD&targets=GTQ,EUR,MXN` | Múltiples tasas |
| POST | `/api/fx/convert` | Convertir monto entre monedas |
| GET | `/api/fx/currencies` | Monedas soportadas |
| GET | `/api/fx/cache/stats` | Estadísticas de caché |

#### Payment-Service (vía API Gateway `/api/payments/`)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/payments/process` | CLIENTE/ADMIN | Procesar pago (con FX) |
| POST | `/api/payments/refund` | ADMIN | Reembolsar pago |
| GET | `/api/payments/order/:orderId` | Auth | Pagos por pedido |
| GET | `/api/payments/` | ADMIN | Todos los pagos |
| GET | `/api/payments/fx/convert` | Auth | Conversión de moneda |

#### Delivery-Service (endpoints actualizados)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| PUT | `/api/deliveries/:id/complete` | Completar con foto (base64) |
| PUT | `/api/deliveries/:id/fail` | Reportar fallo con motivo |
| GET | `/api/deliveries/:id/photo` | Obtener foto de evidencia |
| GET | `/api/deliveries/order/:orderId/photo` | Foto por pedido |

### 16.4 Modelo de Datos (Nuevos/Modificados)

**payment_db.payments:**
```sql
payment_number VARCHAR(20) UNIQUE
order_id INT NOT NULL
user_id INT NOT NULL
amount DECIMAL(10,2)
currency VARCHAR(3)          -- GTQ, USD, EUR, etc.
amount_usd DECIMAL(10,2)     -- Monto convertido
exchange_rate DECIMAL(15,8)  -- Tasa aplicada
payment_method VARCHAR(50)
card_last_four VARCHAR(4)
transaction_id VARCHAR(100)
status ENUM('PENDIENTE','COMPLETADO','FALLIDO','REEMBOLSADO')
refund_reason TEXT
original_payment_id INT      -- Para reembolsos
```

**orders_db.orders.status** (actualizado):
```
CREADA → CONFIRMADA → EN_PREPARACION → LISTA → EN_CAMINO → ENTREGADO
                                                          → PAGADO
                                                          → REEMBOLSADO
                                → CANCELADA → RECHAZADA
```

**delivery_db.deliveries** (columnas nuevas):
```sql
photo_evidence LONGTEXT       -- Base64 de la foto
photo_content_type VARCHAR(50)
failure_reason TEXT
status ENUM(..., 'FALLIDO')
```

### 16.5 Documentación Técnica

| Documento | Contenido |
|-----------|-----------|
| [docs/FX-SERVICE.md](docs/FX-SERVICE.md) | Arquitectura completa del FX-Service, caché 3 niveles, REST+gRPC, config, tests |
| [docs/REFUND-FLOW.md](docs/REFUND-FLOW.md) | Flujo de reembolso, diagrama, estados, modelo de datos, seguridad |
| [docs/IMAGE-STORAGE-JUSTIFICATION.md](docs/IMAGE-STORAGE-JUSTIFICATION.md) | Comparativa Base64 vs FileSystem vs Cloud Storage, justificación de decisión |

### 16.6 Rúbrica Práctica 5

| Criterio | Puntos | Estado | Evidencia |
|----------|--------|--------|-----------|
| **FX-Service funcional** | 10 | OK | Python Flask + gRPC, caché Redis 3 niveles |
| **FX-Service REST + gRPC** | 5 | OK | 5 endpoints REST + 3 RPCs gRPC |
| **FX-Service tests unitarios** | 5 | OK | 5 tests (cache, API, fallback, error, convert) |
| **FX-Service caché Redis** | 5 | OK | TTL 6min + fallback 24h + stats endpoint |
| **Payment-Service** | 5 | OK | Node.js Express, pago simulado + FX |
| **Pago con conversión FX** | 5 | OK | Frontend PaymentPage 4 pasos + tasa en tiempo real |
| **Reembolso (solo admin)** | 5 | OK | POST /refund + modal frontend + motivo |
| **Foto al completar entrega** | 5 | OK | RepartidorDashboard con upload modal |
| **Entrega fallida** | 5 | OK | Botón "Reportar Fallo" + motivo + estado FALLIDO |
| **Ver foto (cliente + admin)** | 5 | OK | MyOrders + AdminPanel photo modals |
| **Panel admin pagos/FX** | 5 | OK | Tabs "Pagos" y "FX Cache" en AdminPanel |
| **Nuevos estados (PAGADO, REEMBOLSADO, FALLIDO)** | 5 | OK | Orders + Delivery models actualizados |
| **Docker Compose completo** | 5 | OK | 3 nuevos containers + payment-db + volumes |
| **Frontend para toda funcionalidad** | 10 | OK | PaymentPage + RepartidorDashboard + MyOrders + AdminPanel |
| **Documentación técnica (3 docs)** | 10 | OK | FX-SERVICE.md + REFUND-FLOW.md + IMAGE-STORAGE-JUSTIFICATION.md |
| **Health endpoints nuevos servicios** | 5 | OK | /health en fx-service y payment-service |
| **TOTAL** | **100** | OK | **100/100** |

---

**Versión:** 2.0.0 | **Fecha:** 2025 | **Curso:** Software Avanzado  
**Práctica:** 5 — Integración de Servicios Financieros y Evidencia de Entrega (DeliverEats Fase 2)
