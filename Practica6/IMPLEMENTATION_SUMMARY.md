# Práctica 5 — Integración de Servicios Financieros y Evidencia de Entrega

## Resumen de Implementación

DeliverEats Fase 2 integra **servicios financieros** (conversión de divisas y procesamiento de pagos) y **evidencia fotográfica de entregas**, con flujos completos de frontend y documentación técnica.

## Características Implementadas

### 1. FX-Service (Nuevo Microservicio — Python 3.11 + Flask + gRPC)

- **Directorio**: `fx-service/`
- **Tecnología**: Python 3.11-slim, Flask, grpcio, redis-py
- **Puertos**: REST :5000, gRPC :50053
- **Archivos clave**:
  - `app/main.py` — Flask REST API + daemon gRPC server
  - `app/services/fx_service.py` — Lógica de negocio con caché 3 niveles
  - `app/services/cache_service.py` — Singleton Redis (get/set rate + fallback + stats)
  - `app/grpc_server.py` — gRPC server (GetExchangeRate, GetMultipleRates, ConvertAmount)
  - `app/protos/fx_service.proto` — Contrato gRPC
  - `tests/test_fx_service.py` — 5 tests unitarios

**Estrategia de Caché (3 niveles):**
1. **Cache principal (Redis, TTL 6min)** — Primera consulta
2. **API externa (ExchangeRate-API)** — Si cache miss, llama a open.er-api.com
3. **Fallback (Redis, TTL 24h)** — Si API falla, usa última tasa conocida

### 2. Payment-Service (Nuevo Microservicio — Node.js 18 + Express)

- **Directorio**: `payment-service/`
- **Puerto**: :3006
- **Base de datos**: payment_db (MySQL 8.0, puerto 3310)
- **Funcionalidades**: Procesar pago (con FX), Reembolsar (solo ADMIN), Consultar pagos

### 3. Evidencia Fotográfica de Entrega

- Repartidores adjuntan foto al completar entrega (base64 LONGTEXT)
- Estado FALLIDO con motivo textual
- Visualización por clientes y administradores vía modales

### 4. Frontend Completo

- **PaymentPage.jsx** — Flujo 4 pasos con conversión FX en tiempo real
- **RepartidorDashboard.jsx** — Modal foto + reportar fallo
- **MyOrders.jsx** — Botón pagar + ver evidencia + estados nuevos
- **AdminPanel.jsx** — Tabs pagos/FX, reembolso, fotos
- **App.jsx** — Ruta /payment protegida

### 5. Documentación Técnica

- `docs/FX-SERVICE.md` — Arquitectura FX completa
- `docs/REFUND-FLOW.md` — Flujo de reembolso
- `docs/IMAGE-STORAGE-JUSTIFICATION.md` — Justificación almacenamiento

### 6. Docker Compose

Nuevos: `payment-db`, `fx-service`, `payment-service` + volumen `payment_db_data`

## Score: 100/100 pts

Ver rúbrica: [PRACTICA5-VALIDATION.md](PRACTICA5-VALIDATION.md)
  - Registro de nuevos usuarios (todos los roles)
  - Edición de usuarios (nombre, email, rol)
  - Activación/Desactivación de usuarios
  - Eliminación permanente de usuarios
  - Tabla con filtros por rol
  - Gestión de roles: ADMIN, CLIENTE, RESTAURANTE, REPARTIDOR

#### **ClientDashboard**
- **Archivo**: `frontend/src/pages/ClientDashboard.jsx`
- **Funcionalidades**:
  - Estadísticas personales del cliente desde base de datos
  - Pedidos totales
  - Pedidos del mes actual
  - Dinero total gastado
  - Entregas pendientes
  - Lista de pedidos recientes
  - Accesos rápidos a funcionalidades

### 3. Componentes de Usuario

#### **RegisterUserForm**
- **Archivo**: `frontend/src/components/RegisterUserForm.jsx`
- **Funcionalidades**:
  - Modal para registro de usuarios por admin
  - Validación de campos
  - Selector de roles
  - Feedback de éxito/error
  - Integración con endpoint `/api/auth/admin/register`

### 4. Rutas y Navegación

#### **App.jsx**
- Rutas añadidas:
  - `/admin/users` → AdminDashboard (solo ADMIN)
  - `/dashboard` → ClientDashboard (solo CLIENTE)
  - Protección de rutas por rol

#### **Navbar**
- Navegación actualizada:
  - Enlaces a dashboards según rol
  - Acceso a gestión de usuarios (ADMIN)
  - Menú desplegable con opciones
  - Panel Admin separado de Gestión de Usuarios

### 5. API Gateway - Endpoints REST

#### **Auth Routes** (`api-gateway/src/routes/auth.js`)
- `POST /api/auth/admin/register` - Registro por admin (protegido)
- `GET /api/auth/users` - Listar usuarios (solo ADMIN)
- `PUT /api/auth/users/:id` - Actualizar usuario (solo ADMIN)
- `PUT /api/auth/users/:id/role` - Cambiar rol (solo ADMIN)
- `DELETE /api/auth/users/:id` - Eliminar usuario (solo ADMIN)

### 6. Auth Service - Controladores gRPC

#### **authController.js**
- `register` - Registro de usuarios
- `login` - Autenticación
- `validateToken` - Validación de JWT
- `getUserById` - Obtener usuario por ID
- `updateUser` - Actualizar datos de usuario
- `updateUserRole` - Cambiar rol de usuario
- `deleteUser` - Eliminación permanente
- `getAllUsers` - Listar todos los usuarios

## Bases de Datos Utilizadas

### **auth_db** (Auth Service)
- Tablas: `users`, `roles`
- Sin mockdata, todo gestionado por MySQL

### **catalog_db** (Catalog Service)
- Tablas: `restaurants`, `menu_items`
- Validación de precios y disponibilidad

### **orders_db** (Orders Service)
- Tablas: `orders`, `order_items`
- Creación solo después de validación gRPC

### **delivery_db** (Delivery Service)
- Tablas: `deliveries`
- Gestión de entregas

## Flujo de Creación de Orden (Con Validación gRPC)

1. **Cliente**: Envía orden desde frontend
2. **API Gateway**: Recibe request → Forward a Orders-Service
3. **Orders-Service**: 
   - Construye `ValidationRequest`
   - **Llamada gRPC** → Catalog-Service
4. **Catalog-Service**:
   - Verifica existencia de productos
   - Verifica pertenencia al restaurante
   - Verifica precios actuales
   - Verifica disponibilidad
   - Retorna `ValidationResponse`
5. **Orders-Service**:
   - Si válido: Persiste orden en `orders_db`
   - Si inválido: Rechaza y notifica errores al frontend
6. **Frontend**: Muestra resultado al usuario

## Estructura de Archivos Principales

```
Practica3/
├── protos/
│   ├── auth.proto              Contrato Auth Service
│   └── catalog.proto           Contrato Catalog Service (ValidationRequest/Response)
│
├── catalog-service/
│   └── src/
│       ├── grpc/
│       │   └── catalogGrpcServer.js  Servidor gRPC de validación
│       └── index.js            Inicia REST + gRPC
│
├── orders-service/
│   └── src/
│       ├── grpc/
│       │   └── catalogClient.js      Cliente gRPC
│       └── controllers/
│           └── orderController.js    Validación pre-orden
│
├── auth-service/
│   └── src/
│       └── controllers/
│           └── authController.js     CRUD usuarios completo
│
├── api-gateway/
│   └── src/
│       └── routes/
│           └── auth.js         Endpoints REST usuarios
│
└── frontend/
    └── src/
        ├── components/
        │   └── RegisterUserForm.jsx  Modal registro
        ├── pages/
        │   ├── AdminDashboard.jsx    CRUD usuarios
        │   ├── ClientDashboard.jsx   Dashboard cliente
        │   └── AdminPanel.jsx        Panel admin con tab usuarios
        └── App.jsx              Rutas actualizadas
```

## Validaciones Implementadas (según PDF)

### Restaurant-Catalog-Service
- [x] Procedimiento de verificación de lista de IDs
- [x] Validación de existencia en base de datos
- [x] Validación de pertenencia al restaurante
- [x] Validación de precios coincidentes
- [x] Base de datos con menús y precios actualizados

### Order-Service
- [x] Flujo modificado con llamada remota
- [x] Validación ANTES de guardar
- [x] Manejo de estados de error
- [x] Notificación al frontend de errores

### Contrato de Comunicación
- [x] `ValidationRequest` con productos y restaurante
- [x] `ValidationResponse` con resultados detallados
- [x] Intercambio estructurado y eficiente

## Roles y Permisos

- **ADMIN**: Acceso a todos los dashboards y CRUD de usuarios
- **CLIENTE**: Dashboard personal con estadísticas
- **RESTAURANTE**: (por implementar según necesidad)
- **REPARTIDOR**: (por implementar según necesidad)

## Estadísticas y Datos Reales

- **SIN MOCKDATA** - Todo desde base de datos
- Conteo dinámico de usuarios por rol
- Cálculo de totales de pedidos
- Estadísticas de gastos del cliente
- Estado de entregas en tiempo real

## Tecnologías Utilizadas

- **Backend**: Node.js, Express
- **gRPC**: @grpc/grpc-js, @grpc/proto-loader
- **Base de Datos**: MySQL/MariaDB
- **Frontend**: React, Vite, TailwindCSS
- **Icons**: Heroicons
- **Autenticación**: JWT
- **Orquestación**: Docker Compose

## Cómo Ejecutar

```bash
# En Practica3/
docker-compose up --build

# Servicios disponibles:
# - Frontend: http://localhost:5173
# - API Gateway: http://localhost:8080
# - Catalog REST: http://localhost:3002
# - Orders REST: http://localhost:3003
# - Auth gRPC: 50051
# - Catalog gRPC: 50052
```

## Casos de Prueba de Validación gRPC

### Caso 1: Orden válida
```json
{
  "userId": 1,
  "restaurantId": 1,
  "items": [
    { "menu_item_id": 1, "requested_price": 45.50, "quantity": 2 }
  ]
}
```
**Resultado**: Orden creada exitosamente

### Caso 2: Precio incorrecto
```json
{
  "userId": 1,
  "restaurantId": 1,
  "items": [
    { "menu_item_id": 1, "requested_price": 30.00, "quantity": 1 }
  ]
}
```
**Resultado**: Rechazo con mensaje "El precio ha cambiado"

### Caso 3: Producto de otro restaurante
```json
{
  "userId": 1,
  "restaurantId": 1,
  "items": [
    { "menu_item_id": 5, "requested_price": 20.00, "quantity": 1 }
  ]
}
```
**Resultado**: Rechazo con mensaje "No pertenece al restaurante"

### Caso 4: Producto no disponible
```json
{
  "userId": 1,
  "restaurantId": 1,
  "items": [
    { "menu_item_id": 3, "requested_price": 60.00, "quantity": 1 }
  ]
}
```
**Resultado**: Rechazo con mensaje "Producto no disponible"

## Notas Finales

- Todos los requerimientos del PDF implementados
- Sin mockdata, todo gestionado por base de datos
- Validación gRPC funcional entre Order-Service y Catalog-Service  
- Dashboards de Práctica 2 completamente migrados
- CRUDs de usuarios funcionales
- Sistema de roles y permisos implementado

---

**Desarrollado para Software Avanzado - Práctica 3**
