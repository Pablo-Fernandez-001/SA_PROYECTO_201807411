# Diagramas de Actividades y Secuencia - DeliverEats
## Versión 1.3.0 - Práctica 6 (Arquitectura Orientada a Eventos)

---

## 1. Diagrama de Actividades: Flujo Completo de Orden

```mermaid
flowchart TD
    START([👤 Cliente inicia sesión]) --> LOGIN[Login con email/password]
    LOGIN --> VALIDATE_JWT{¿JWT válido?}
    VALIDATE_JWT -->|No| LOGIN
    VALIDATE_JWT -->|Sí| BROWSE[Explorar restaurantes]
    
    BROWSE --> SELECT_REST[Seleccionar restaurante]
    SELECT_REST --> VIEW_MENU[Ver menú del restaurante]
    VIEW_MENU --> ADD_ITEMS[Agregar ítems al carrito]
    ADD_ITEMS --> MORE{¿Agregar más?}
    MORE -->|Sí| ADD_ITEMS
    MORE -->|No| CHECKOUT[Realizar pedido]
    
    CHECKOUT --> VALIDATE_ITEMS{¿Items disponibles?}
    VALIDATE_ITEMS -->|No| ERROR1[Error: Ítem no disponible]
    ERROR1 --> VIEW_MENU
    VALIDATE_ITEMS -->|Sí| CREATE_ORDER[Crear orden en BD]
    
    CREATE_ORDER --> PUBLISH_MSG[Publicar mensaje en RabbitMQ]
    PUBLISH_MSG --> NOTIFY_CLIENT[Notificar cliente por email]
    NOTIFY_CLIENT --> ORDER_CREATED([✅ Orden creada])
    
    ORDER_CREATED --> RESTAURANT_NOTIF[🍽️ Restaurante recibe notificación]
    RESTAURANT_NOTIF --> RESTAURANT_DECISION{Restaurante decide}
    
    RESTAURANT_DECISION -->|Acepta| UPDATE_PROCESO[Estado: EN PROCESO]
    RESTAURANT_DECISION -->|Rechaza| UPDATE_RECHAZADA[Estado: RECHAZADA]
    UPDATE_RECHAZADA --> NOTIFY_REJECTED[Notificar rechazo a cliente]
    NOTIFY_REJECTED --> END1([❌ Fin: Orden rechazada])
    
    UPDATE_PROCESO --> PREPARE[Preparar orden]
    PREPARE --> COMPLETE[Estado: FINALIZADO]
    COMPLETE --> NOTIFY_DELIVERY[Notificar a Delivery Service]
    
    NOTIFY_DELIVERY --> DELIVERY_ASSIGN[🚗 Repartidor acepta entrega]
    DELIVERY_ASSIGN --> UPDATE_ENCAMINO[Estado: EN CAMINO]
    UPDATE_ENCAMINO --> NOTIFY_ONCAMINO[Notificar cliente]
    
    NOTIFY_ONCAMINO --> DELIVER[Repartidor entrega]
    DELIVER --> UPDATE_DELIVERED[Estado: ENTREGADO]
    UPDATE_DELIVERED --> NOTIFY_DELIVERED[Notificar cliente]
    NOTIFY_DELIVERED --> END2([✅ Fin: Orden entregada])
    
    %% Cancelaciones
    ORDER_CREATED -.->|Cliente cancela| CANCEL_CLIENT[Estado: CANCELADO]
    UPDATE_PROCESO -.->|Cliente cancela| CANCEL_CLIENT
    CANCEL_CLIENT -.-> NOTIFY_CANCEL[Notificar cancelación]
    NOTIFY_CANCEL -.-> END3([❌ Fin: Orden cancelada])
    
    UPDATE_ENCAMINO -.->|Repartidor cancela| CANCEL_DELIVERY[Estado: CANCELADO]
    CANCEL_DELIVERY -.-> NOTIFY_CANCEL

    style START fill:#e1f5ff
    style ORDER_CREATED fill:#c8e6c9
    style END1 fill:#ffcdd2
    style END2 fill:#c8e6c9
    style END3 fill:#ffcdd2
    style PUBLISH_MSG fill:#fff9c4
    style NOTIFY_CLIENT fill:#ffe0b2
    style RESTAURANT_NOTIF fill:#f8bbd0
    style DELIVERY_ASSIGN fill:#d1c4e9
```

---

## 2. Diagrama de Secuencia: Autenticación (Login)

```mermaid
sequenceDiagram
    actor Cliente as 👤 Cliente
    participant FE as Frontend
    participant ING as Ingress
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant DB as Auth DB

    Cliente->>FE: Ingresa email/password
    FE->>FE: Validación básica (formato)
    FE->>ING: POST /api/auth/login (HTTPS)
    Note over FE,ING: { email, password }
    
    ING->>GW: POST /api/auth/login (HTTP)
    GW->>GW: Validar request body
    GW->>AUTH: Login(email, password) [gRPC]
    
    AUTH->>DB: SELECT * FROM users<br/>WHERE email=?
    DB-->>AUTH: User data {id, email, password, role}
    
    alt Usuario no encontrado
        AUTH-->>GW: Error: Usuario no encontrado
        GW-->>ING: 401 Unauthorized
        ING-->>FE: 401 Unauthorized
        FE->>Cliente: ❌ Error: Credenciales inválidas
    else Usuario encontrado
        AUTH->>AUTH: bcrypt.compare(password, hash)
        
        alt Contraseña incorrecta
            AUTH-->>GW: Error: Contraseña incorrecta
            GW-->>ING: 401 Unauthorized
            ING-->>FE: 401 Unauthorized
            FE->>Cliente: ❌ Error: Credenciales inválidas
        else Contraseña correcta
            AUTH->>AUTH: jwt.sign({userId, email, role}, JWT_SECRET, {expiresIn: '24h'})
            AUTH-->>GW: LoginResponse(token, user)
            Note over AUTH,GW: { token: "eyJ...", user: {...} }
            
            GW-->>ING: 200 OK + JSON
            ING-->>FE: 200 OK + JSON
            FE->>FE: localStorage.setItem('token', token)
            FE->>Cliente: ✅ Inicio de sesión exitoso<br/>Redirigir a home
        end
    end
```

---

## 3. Diagrama de Secuencia: Creación de Orden con RabbitMQ (Arquitectura Orientada a Eventos)

```mermaid
sequenceDiagram
    actor Cliente as 👤 Cliente
    participant FE as Frontend
    participant GW as API Gateway
    participant ORD as Order Service
    participant CAT as Catalog Service
    participant RMQ as RabbitMQ
    participant CATCONS as Catalog Consumer
    participant CATDB as Catalog DB
    participant NOT as Notification Service
    participant DB as Orders DB

    Cliente->>FE: Crear orden con ítems
    FE->>GW: POST /api/orders + JWT
    Note over FE,GW: Authorization: Bearer <token><br/>{ restaurantId, items[], deliveryAddress }
    
    GW->>GW: Validar JWT
    alt JWT inválido o expirado
        GW-->>FE: 401 Unauthorized
        FE->>Cliente: ❌ Sesión expirada
    else JWT válido
        GW->>ORD: CreateOrder(...) [gRPC]
        
        ORD->>CAT: ValidateMenuItems(restaurantId, itemIds) [gRPC]
        CAT->>CAT: Verificar que items existen<br/>y pertenecen al restaurante
        
        alt Items inválidos
            CAT-->>ORD: ValidationResponse(valid=false)
            ORD-->>GW: Error: Items no válidos
            GW-->>FE: 400 Bad Request
            FE->>Cliente: ❌ Algunos items no están disponibles
        else Items válidos
            CAT-->>ORD: ValidationResponse(valid=true, itemsData)
            
            ORD->>ORD: Calcular total
            ORD->>DB: INSERT INTO orders (...)
            DB-->>ORD: Order ID generado
            ORD->>DB: INSERT INTO order_items (...)
            
            Note over ORD,RMQ: 🚀 Práctica 6: Comunicación Asíncrona
            ORD->>RMQ: Publish(orders.created, orderData)
            Note over ORD,RMQ: Message: {<br/>  event: "order.created",<br/>  timestamp,<br/>  data: {<br/>    orderId,<br/>    restaurantId,<br/>    userId,<br/>    items[],<br/>    total,<br/>    deliveryAddress<br/>  }<br/>}
            
            RMQ-->>ORD: ACK (Mensaje recibido)
            ORD-->>GW: CreateOrderResponse(orderId, total, status)
            GW-->>FE: 201 Created + JSON
            FE->>Cliente: ✅ Orden creada exitosamente<br/>Número: {orderId}
            
            Note over RMQ,CATCONS: 📦 Procesamiento Asíncrono por Restaurant-Service
            RMQ->>CATCONS: Consume(orders.created)
            CATCONS->>CATCONS: Parse event data
            CATCONS->>CATCONS: Log order details
            
            CATCONS->>CATDB: BEGIN TRANSACTION
            CATCONS->>CATDB: INSERT INTO received_orders<br/>(order_id, restaurant_id, user_id,<br/>total_amount, delivery_address)
            CATDB-->>CATCONS: received_order_id
            
            loop Para cada item
                CATCONS->>CATDB: INSERT INTO received_order_items<br/>(received_order_id, item_id,<br/>quantity, unit_price, subtotal)
            end
            
            CATCONS->>CATDB: COMMIT
            CATDB-->>CATCONS: Transaction OK
            
            CATCONS->>CATCONS: Log success message
            CATCONS-->>RMQ: ACK (Mensaje procesado)
            
            Note over RMQ,NOT: 📧 Notificaciones por Email (Paralelo)
            RMQ->>NOT: Consume(orders.created)
            NOT->>NOT: Generar email para cliente
            NOT->>NOT: Generar email para restaurante
            NOT-->>NOT: Enviar emails vía SMTP
            NOT-->>RMQ: ACK (Emails enviados)
        end
    end
```

**Notas importantes:**

1. **Comunicación Síncrona (gRPC):** 
   - Order-Service → Catalog-Service: Validación de items antes de crear la orden
   
2. **Comunicación Asíncrona (RabbitMQ):**
   - Order-Service publica evento `orders.created` después de persistir la orden
   - Catalog-Service consume el evento y persiste la orden en `catalog_db`
   - Notification-Service consume el evento para enviar emails (independiente)

3. **Persistencia Dual:**
   - `orders_db`: Contiene la orden original creada por Order-Service
   - `catalog_db`: Contiene copia de la orden recibida vía RabbitMQ para procesamiento del restaurante

4. **Ventajas del Patrón:**
   - Desacoplamiento entre servicios
   - Procesamiento asíncrono no bloquea la respuesta al cliente
   - Tolerancia a fallos: Si Catalog-Service está caído, el mensaje queda en cola
   - Múltiples consumidores pueden procesar el mismo evento

---

## 4. Diagrama de Secuencia: Consulta de Restaurantes (con Caché)

```mermaid
sequenceDiagram
    actor Cliente as 👤 Cliente
    participant FE as Frontend
    participant GW as API Gateway
    participant CAT as Catalog Service
    participant CACHE as Redis
    participant DB as Catalog DB

    Cliente->>FE: Ver lista de restaurantes
    FE->>GW: GET /api/restaurants
    Note over FE,GW: Sin autenticación (público)
    
    GW->>CAT: GetRestaurants() [gRPC]
    
    CAT->>CACHE: GET restaurants:all
    
    alt Cache Hit
        CACHE-->>CAT: [Lista de restaurantes en JSON]
        Note over CACHE,CAT: ⚡ Respuesta rápida desde caché
        CAT-->>GW: GetRestaurantsResponse(restaurants)
        GW-->>FE: 200 OK + JSON
        FE->>Cliente: 📋 Mostrar lista de restaurantes
    else Cache Miss
        CACHE-->>CAT: NULL (No existe en caché)
        
        CAT->>DB: SELECT * FROM restaurants<br/>WHERE active=1
        DB-->>CAT: [Rows de restaurantes]
        
        CAT->>CAT: Formatear a JSON
        CAT->>CACHE: SET restaurants:all, JSON, EX 300
        Note over CAT,CACHE: TTL = 5 minutos
        
        CAT-->>GW: GetRestaurantsResponse(restaurants)
        GW-->>FE: 200 OK + JSON
        FE->>Cliente: 📋 Mostrar lista de restaurantes
    end
```

---

## 5. Diagrama de Actividades: Gestión de Órdenes por Restaurante

```mermaid
flowchart TD
    START([🍽️ Restaurante inicia sesión]) --> LOGIN[Login con credenciales]
    LOGIN --> DASHBOARD[Ver dashboard]
    
    DASHBOARD --> VIEW_ORDERS[Ver órdenes pendientes]
    VIEW_ORDERS --> FILTER{Filtrar por estado}
    FILTER -->|CREADA| NEW_ORDERS[Órdenes nuevas]
    FILTER -->|EN PROCESO| IN_PROGRESS[Órdenes en preparación]
    
    NEW_ORDERS --> SELECT_ORDER[Seleccionar orden]
    SELECT_ORDER --> VIEW_DETAILS[Ver detalles de orden]
    VIEW_DETAILS --> DECISION{Decisión}
    
    DECISION -->|Aceptar| ACCEPT[Aceptar orden]
    DECISION -->|Rechazar| REJECT[Rechazar orden]
    
    ACCEPT --> UPDATE_STATUS1[Estado: EN PROCESO]
    UPDATE_STATUS1 --> NOTIFY1[Notificar cliente]
    NOTIFY1 --> PREPARE[Preparar orden]
    
    REJECT --> UPDATE_STATUS2[Estado: RECHAZADA]
    UPDATE_STATUS2 --> NOTIFY2[Notificar cliente]
    NOTIFY2 --> END1([❌ Orden rechazada])
    
    PREPARE --> COMPLETE{¿Listo?}
    COMPLETE -->|No| PREPARE
    COMPLETE -->|Sí| MARK_DONE[Marcar como finalizado]
    
    MARK_DONE --> UPDATE_STATUS3[Estado: FINALIZADO]
    UPDATE_STATUS3 --> NOTIFY3[Notificar sistema delivery]
    NOTIFY3 --> END2([✅ Orden lista para entrega])
    
    IN_PROGRESS --> CONTINUE[Continuar preparación]
    CONTINUE --> MARK_DONE

    style START fill:#f8bbd0
    style END1 fill:#ffcdd2
    style END2 fill:#c8e6c9
    style DECISION fill:#fff9c4
    style ACCEPT fill:#c8e6c9
    style REJECT fill:#ffcdd2
```

---

## 6. Diagrama de Actividades: Repartidor Entrega Orden

```mermaid
flowchart TD
    START([🚗 Repartidor inicia sesión]) --> LOGIN[Login con credenciales]
    LOGIN --> DASHBOARD[Ver dashboard]
    
    DASHBOARD --> VIEW_AVAILABLE[Ver órdenes disponibles]
    VIEW_AVAILABLE --> FILTER[Filtrar por ubicación/distancia]
    FILTER --> SELECT_ORDER[Seleccionar orden]
    
    SELECT_ORDER --> VIEW_DETAILS[Ver detalles]
    VIEW_DETAILS --> ACCEPT{¿Aceptar?}
    ACCEPT -->|No| VIEW_AVAILABLE
    ACCEPT -->|Sí| ASSIGN[Aceptar entrega]
    
    ASSIGN --> UPDATE_STATUS1[Estado: EN CAMINO]
    UPDATE_STATUS1 --> NOTIFY_CLIENT[Notificar cliente]
    NOTIFY_CLIENT --> PICKUP[Recoger orden en restaurante]
    
    PICKUP --> NAVIGATE[Navegar a dirección de entrega]
    NAVIGATE --> ARRIVE[Llegar a destino]
    ARRIVE --> DELIVER[Entregar orden al cliente]
    
    DELIVER --> CONFIRM{¿Cliente confirma?}
    CONFIRM -->|Sí| MARK_DELIVERED[Marcar como entregado]
    CONFIRM -->|No (cliente no está)| TRY_CONTACT[Intentar contactar]
    
    TRY_CONTACT --> WAIT{¿Responde?}
    WAIT -->|Sí| DELIVER
    WAIT -->|No después de 10 min| CANCEL_DELIVERY[Cancelar entrega]
    CANCEL_DELIVERY --> UPDATE_STATUS2[Estado: CANCELADO]
    UPDATE_STATUS2 --> RETURN[Regresar orden al restaurante]
    RETURN --> END1([❌ Entrega cancelada])
    
    MARK_DELIVERED --> UPDATE_STATUS3[Estado: ENTREGADO]
    UPDATE_STATUS3 --> CAPTURE_PROOF[Capturar prueba de entrega]
    CAPTURE_PROOF --> SUBMIT[Enviar confirmación]
    SUBMIT --> NOTIFY_COMPLETE[Notificar cliente y sistema]
    NOTIFY_COMPLETE --> END2([✅ Entrega completada])

    style START fill:#d1c4e9
    style END1 fill:#ffcdd2
    style END2 fill:#c8e6c9
    style CANCEL_DELIVERY fill:#ffcdd2
    style MARK_DELIVERED fill:#c8e6c9
```

---

## 7. Diagrama de Secuencia: Flujo JWT Completo

```mermaid
sequenceDiagram
    actor Usuario as 👤 Usuario
    participant FE as Frontend
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant CAT as Catalog Service

    Note over Usuario,AUTH: 1️⃣ Fase de Login
    Usuario->>FE: Login (email, password)
    FE->>GW: POST /api/auth/login
    GW->>AUTH: Login(email, password) [gRPC]
    AUTH->>AUTH: Validar credenciales<br/>Generar JWT
    Note over AUTH: jwt.sign({<br/>  userId: "uuid",<br/>  email: "user@email.com",<br/>  role: "CLIENTE"<br/>}, JWT_SECRET, {expiresIn: "24h"})
    
    AUTH-->>GW: { token: "eyJhbG...", user }
    GW-->>FE: 200 OK + token
    FE->>FE: Almacenar token en localStorage
    
    Note over Usuario,CAT: 2️⃣ Peticiones Protegidas
    Usuario->>FE: Crear orden
    FE->>FE: Obtener token de localStorage
    FE->>GW: POST /api/orders<br/>Authorization: Bearer eyJhbG...
    
    GW->>GW: Extraer token del header
    GW->>GW: jwt.verify(token, JWT_SECRET)
    
    alt Token inválido o expirado
        GW-->>FE: 401 Unauthorized<br/>{ error: "Token inválido" }
        FE->>Usuario: ❌ Sesión expirada<br/>Redirigir a login
    else Token válido
        GW->>GW: Extraer payload:<br/>{ userId, email, role }
        
        Note over GW,CAT: 3️⃣ Autorización por Rol
        alt Rol no autorizado
            GW-->>FE: 403 Forbidden<br/>{ error: "No autorizado" }
            FE->>Usuario: ❌ No tienes permisos
        else Rol autorizado
            GW->>CAT: CreateOrder(userId, ...) [gRPC]
            CAT->>CAT: Procesar orden
            CAT-->>GW: OrderResponse
            GW-->>FE: 201 Created + Order
            FE->>Usuario: ✅ Orden creada
        end
    end
    
    Note over Usuario,AUTH: 4️⃣ Renovación de Token (Opcional)
    FE->>GW: POST /api/auth/refresh<br/>Authorization: Bearer ...
    GW->>AUTH: RefreshToken(token) [gRPC]
    AUTH->>AUTH: Validar token actual<br/>Generar nuevo token
    AUTH-->>GW: { newToken: "eyJ..." }
    GW-->>FE: 200 OK + newToken
    FE->>FE: Actualizar token en localStorage
```

---

## 8. Diagrama de Actividades: Administrador Gestiona Restaurantes

```mermaid
flowchart TD
    START([👨‍💼 Admin inicia sesión]) --> LOGIN[Login con rol ADMIN]
    LOGIN --> VERIFY_ROLE{¿Rol = ADMIN?}
    VERIFY_ROLE -->|No| FORBIDDEN([❌ Acceso denegado])
    VERIFY_ROLE -->|Sí| DASHBOARD[Ver panel de administración]
    
    DASHBOARD --> MENU{Seleccionar acción}
    MENU -->|Gestionar restaurantes| REST_MANAGE
    MENU -->|Gestionar usuarios| USER_MANAGE
    MENU -->|Ver reportes| REPORTS
    
    REST_MANAGE[Gestionar Restaurantes] --> REST_ACTION{Acción}
    REST_ACTION -->|Crear| CREATE_REST[Crear nuevo restaurante]
    REST_ACTION -->|Editar| SELECT_EDIT[Seleccionar restaurante]
    REST_ACTION -->|Eliminar| SELECT_DELETE[Seleccionar restaurante]
    REST_ACTION -->|Listar| LIST_REST[Ver todos los restaurantes]
    
    CREATE_REST --> FORM1[Llenar formulario]
    FORM1 --> ASSIGN_OWNER[Asignar usuario RESTAURANTE]
    ASSIGN_OWNER --> VALIDATE1{¿Datos válidos?}
    VALIDATE1 -->|No| FORM1
    VALIDATE1 -->|Sí| SAVE_REST[Guardar en BD]
    SAVE_REST --> SUCCESS1([✅ Restaurante creado])
    
    SELECT_EDIT --> EDIT_FORM[Editar datos]
    EDIT_FORM --> VALIDATE2{¿Datos válidos?}
    VALIDATE2 -->|No| EDIT_FORM
    VALIDATE2 -->|Sí| UPDATE_REST[Actualizar en BD]
    UPDATE_REST --> SUCCESS2([✅ Restaurante actualizado])
    
    SELECT_DELETE --> CONFIRM{¿Confirmar eliminación?}
    CONFIRM -->|No| REST_MANAGE
    CONFIRM -->|Sí| SOFT_DELETE[Marcar como inactivo]
    SOFT_DELETE --> SUCCESS3([✅ Restaurante eliminado])
    
    LIST_REST --> DISPLAY[Mostrar tabla de restaurantes]
    DISPLAY --> REST_MANAGE
    
    SUCCESS1 --> DASHBOARD
    SUCCESS2 --> DASHBOARD
    SUCCESS3 --> DASHBOARD

    style START fill:#fff4e6
    style FORBIDDEN fill:#ffcdd2
    style SUCCESS1 fill:#c8e6c9
    style SUCCESS2 fill:#c8e6c9
    style SUCCESS3 fill:#c8e6c9
    style SAVE_REST fill:#e1bee7
    style UPDATE_REST fill:#e1bee7
    style SOFT_DELETE fill:#ffccbc
```

---

## 9. Máquina de Estados: Orden

```mermaid
stateDiagram-v2
    [*] --> CREADA: Cliente crea orden
    
    CREADA --> EN_PROCESO: Restaurante acepta
    CREADA --> RECHAZADA: Restaurante rechaza
    CREADA --> CANCELADO: Cliente cancela
    
    EN_PROCESO --> FINALIZADO: Restaurante completa preparación
    EN_PROCESO --> CANCELADO: Cliente cancela
    
    FINALIZADO --> EN_CAMINO: Repartidor acepta
    
    EN_CAMINO --> ENTREGADO: Repartidor entrega exitosamente
    EN_CAMINO --> CANCELADO: Repartidor cancela
    
    RECHAZADA --> [*]
    CANCELADO --> [*]
    ENTREGADO --> [*]
    
    note right of CREADA
        Estado inicial
        Esperando aceptación
    end note
    
    note right of EN_PROCESO
        Restaurante preparando
        Cliente puede cancelar
    end note
    
    note right of FINALIZADO
        Listo para entrega
        Esperando repartidor
    end note
    
    note right of EN_CAMINO
        Repartidor en camino
        No se puede cancelar por cliente
    end note
    
    note right of ENTREGADO
        Estado final exitoso
        No se puede modificar
    end note
```

---

## 10. Resumen de Flujos Críticos

| Flujo | Servicios Involucrados | Comunicación Asíncrona | Estado de Orden |
|-------|------------------------|------------------------|-----------------|
| Login | Frontend → Gateway → Auth Service | No | N/A |
| Crear Orden | Frontend → Gateway → Order Service → Catalog Service → RabbitMQ | ✅ Sí (RabbitMQ) | CREADA |
| Aceptar Orden | Frontend → Gateway → Catalog Service | No | EN PROCESO |
| Rechazar Orden | Frontend → Gateway → Catalog Service | No | RECHAZADA |
| Completar Preparación | Frontend → Gateway → Catalog Service | No | FINALIZADO |
| Aceptar Entrega | Frontend → Gateway → Delivery Service | No | EN CAMINO |
| Completar Entrega | Frontend → Gateway → Delivery Service | No | ENTREGADO |
| Cancelar Orden Cliente | Frontend → Gateway → Order Service | No | CANCELADO |
| Notificaciones Email | RabbitMQ → Notification Service | ✅ Sí (RabbitMQ) | N/A |

---

**Fecha de actualización:** 23 de febrero de 2026  
**Versión:** 1.1.0  
**Estado:** Fase 2 - Actualizado
