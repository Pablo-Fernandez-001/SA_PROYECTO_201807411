# Practica 7 - Sistema de Soporte Tecnico (Mesa de Ayuda) Orientado a Eventos

## 1. Objetivo y alcance

Este documento define la arquitectura, el modelo de datos y los flujos de negocio para un sistema de mesa de ayuda orientado a eventos, con enfoque de microservicios, escalabilidad horizontal y despliegue sobre Kubernetes (K3s). Esta practica cubre analisis, diseno y justificacion tecnica; no incluye implementacion de codigo.

## 2. Requerimientos

### 2.1 Requerimientos funcionales (RF)

1. RF-01: El sistema debe permitir registrar usuarios con roles `requester`, `agent` y `admin`.
2. RF-02: El sistema debe permitir autenticacion por correo y contrasena.
3. RF-03: El sistema debe permitir crear tickets con titulo, descripcion, prioridad y categoria.
4. RF-04: El sistema debe permitir consultar tickets por usuario solicitante.
5. RF-05: El sistema debe permitir consultar tickets por estado (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
6. RF-06: El sistema debe permitir asignar tickets a agentes disponibles.
7. RF-07: El sistema debe permitir reasignar tickets por un administrador.
8. RF-08: El sistema debe permitir agregar comentarios y bitacora de cambios por ticket.
9. RF-09: El sistema debe emitir eventos de dominio para creacion, asignacion y cambios de estado.
10. RF-10: El sistema debe notificar a los involucrados cuando un ticket sea asignado o resuelto.
11. RF-11: El sistema debe mantener trazabilidad de quien creo, asigno y cerro cada ticket.
12. RF-12: El sistema debe exponer endpoints de salud para monitoreo.

### 2.2 Requerimientos no funcionales (RNF)

1. RNF-01: Arquitectura orientada a microservicios con base de datos por servicio.
2. RNF-02: Comunicacion asincrona mediante bus de eventos (RabbitMQ).
3. RNF-03: Tolerancia a fallos con reintentos y cola de mensajes durables.
4. RNF-04: Contenerizacion obligatoria con Docker para todos los servicios.
5. RNF-05: Orquestacion objetivo en K3s/Kubernetes con despliegue declarativo.
6. RNF-06: Seguridad de API mediante JWT y autorizacion por rol.
7. RNF-07: Observabilidad basica con logs estructurados y endpoint `/health`.
8. RNF-08: Escalabilidad horizontal por replicas de servicios sin estado.
9. RNF-09: Cumplir SLA de disponibilidad objetivo del 99.5% en ambiente productivo.
10. RNF-10: Tiempo de respuesta p95 menor a 400 ms en operaciones de lectura.
11. RNF-11: Versionamiento de APIs y contratos de eventos.
12. RNF-12: Dise�o compatible con Linux/WSL y CI/CD.

## 3. Casos de uso

### 3.1 Diagrama de alto nivel

```mermaid
flowchart LR
    RQ[Solicitante] --> UC1((Gestionar Tickets))
    AG[Agente] --> UC1
    AD[Administrador] --> UC1
    AD --> UC2((Gestionar Usuarios y Roles))
    AG --> UC3((Actualizar Estado de Ticket))
    RQ --> UC4((Consultar Estado de Ticket))
```

### 3.2 Caso expandido CDU-01: Creacion de Ticket

- Actor principal: Solicitante
- Actores secundarios: Tickets Service, Event Bus, Notifications Service
- Precondiciones:
1. Usuario autenticado con token valido.
2. Usuario activo en el sistema.
- Flujo normal:
1. El solicitante envia titulo, descripcion, prioridad y categoria.
2. API Gateway valida JWT y reenvia a Tickets Service.
3. Tickets Service valida el payload.
4. Tickets Service persiste ticket con estado inicial `OPEN`.
5. Tickets Service publica evento `ticket.created`.
6. Notifications Service consume el evento y genera aviso.
7. El sistema responde con ticket creado.
- Flujos alternativos:
1. A1 - Datos invalidos: se responde `400 Bad Request`.
2. A2 - Usuario no autorizado: se responde `403 Forbidden`.
3. A3 - Error de persistencia: se responde `500 Internal Server Error`.
- Postcondiciones:
1. Ticket almacenado con identificador unico.
2. Evento `ticket.created` persistido/publicado en el bus.
3. Trazabilidad registrada en auditoria.

### 3.3 Caso expandido CDU-02: Asignacion de Ticket

- Actor principal: Administrador (o motor automatico de asignacion)
- Actores secundarios: Assignments Service, Tickets Service, Event Bus
- Precondiciones:
1. Ticket existe y no esta cerrado.
2. Agente destino existe y esta activo.
3. Actor tiene permisos de asignacion.
- Flujo normal:
1. Administrador selecciona ticket y agente.
2. API Gateway valida JWT y rol.
3. Assignments Service valida reglas de negocio.
4. Assignments Service registra asignacion.
5. Assignments Service solicita cambio de estado a Tickets Service (`ASSIGNED`).
6. Assignments Service publica evento `ticket.assigned`.
7. Notifications Service notifica al agente y solicitante.
- Flujos alternativos:
1. B1 - Ticket no existe: `404 Not Found`.
2. B2 - Agente no disponible: `409 Conflict`.
3. B3 - Ticket cerrado: `409 Conflict`.
- Postcondiciones:
1. Ticket asociado a un agente.
2. Estado actualizado a `ASSIGNED`.
3. Evento `ticket.assigned` generado para consumidores.

## 4. Arquitectura de alto nivel

### 4.1 Diagrama de microservicios y bus de eventos

```mermaid
flowchart LR
    UI[Portal Web / App] --> GW[API Gateway]
    GW --> US[Users Service]
    GW --> TS[Tickets Service]
    GW --> AS[Assignments Service]

    TS -- ticket.created --> MQ[(RabbitMQ)]
    AS -- ticket.assigned --> MQ
    TS -- ticket.status.changed --> MQ

    MQ --> NS[Notifications Service]
    MQ --> AU[Audit Service]

    US --> UDB[(users_db)]
    TS --> TDB[(tickets_db)]
    AS --> ADB[(assignments_db)]
```

### 4.2 Decisiones arquitectonicas clave

1. Bounded contexts por servicio para minimizar acoplamiento.
2. Base de datos aislada por microservicio para autonomia de despliegue.
3. Integracion asincrona por eventos para desacoplar procesos de negocio.
4. Idempotencia requerida en consumidores para evitar procesamiento duplicado.
5. Contratos de eventos versionados para evolucion segura.

## 5. Despliegue

### 5.1 Diagrama de infraestructura (K3s/Kubernetes)

```mermaid
flowchart TB
    USER[Usuarios] --> LB[Load Balancer / Ingress]
    LB --> K3S[K3s Cluster]

    subgraph K3S
      GW_POD[API Gateway Deployment]
      US_POD[Users Service Deployment]
      TS_POD[Tickets Service Deployment]
      AS_POD[Assignments Service Deployment]
      MQ_POD[RabbitMQ StatefulSet]
      OBS[Prometheus + Grafana + Loki]
    end

    GW_POD --> US_POD
    GW_POD --> TS_POD
    GW_POD --> AS_POD
    TS_POD --> MQ_POD
    AS_POD --> MQ_POD

    US_POD --> UDB[(Managed DB users)]
    TS_POD --> TDB[(Managed DB tickets)]
    AS_POD --> ADB[(Managed DB assignments)]

    OBS --> GW_POD
    OBS --> US_POD
    OBS --> TS_POD
    OBS --> AS_POD
```

### 5.2 Componentes de infraestructura

1. Balanceador de entrada: Ingress NGINX.
2. Certificados TLS: cert-manager con ACME.
3. Service mesh (opcional fase futura): Linkerd.
4. Almacenamiento de secretos: Kubernetes Secrets (o Vault en produccion).
5. Servicios externos: proveedor SMTP para correos y sistema de alertas.

## 6. Diagramas de comportamiento

### 6.1 Diagrama de actividades (flujo end-to-end)

```mermaid
flowchart TD
    A([Inicio]) --> B[Solicitante crea ticket]
    B --> C[Validar autenticacion y datos]
    C --> D{Valido?}
    D -- No --> E[Responder error]
    E --> Z([Fin])
    D -- Si --> F[Persistir ticket OPEN]
    F --> G[Publicar evento ticket.created]
    G --> H[Notificar equipo de soporte]
    H --> I[Administrador asigna ticket]
    I --> J[Persistir asignacion]
    J --> K[Actualizar estado ASSIGNED]
    K --> L[Publicar ticket.assigned]
    L --> M[Agente atiende ticket]
    M --> N[Actualizar estado IN_PROGRESS]
    N --> O[Resolver ticket]
    O --> P[Actualizar estado RESOLVED]
    P --> Q[Publicar ticket.status.changed]
    Q --> R[Notificar solicitante]
    R --> Z([Fin])
```

### 6.2 Diagrama de secuencia (incluyendo eventos)

```mermaid
sequenceDiagram
    participant U as Solicitante
    participant GW as API Gateway
    participant TS as Tickets Service
    participant MQ as RabbitMQ
    participant NS as Notifications Service
    participant AD as Administrador
    participant AS as Assignments Service

    U->>GW: POST /tickets
    GW->>TS: Crear ticket (JWT OK)
    TS->>TS: Persistir ticket OPEN
    TS->>MQ: Publish ticket.created
    TS-->>GW: 201 Ticket creado
    GW-->>U: 201 Ticket creado

    MQ-->>NS: Consume ticket.created
    NS->>NS: Generar notificacion

    AD->>GW: POST /assignments
    GW->>AS: Crear asignacion
    AS->>AS: Persistir asignacion
    AS->>TS: PATCH /tickets/:id/status ASSIGNED
    AS->>MQ: Publish ticket.assigned
    AS-->>GW: 201 Asignacion creada

    MQ-->>NS: Consume ticket.assigned
    NS->>NS: Notificar agente y solicitante
```

## 7. Modelo de datos

### 7.1 Diagrama ER

```mermaid
erDiagram
    USERS ||--o{ TICKETS : creates
    USERS ||--o{ ASSIGNMENTS : receives
    TICKETS ||--o{ ASSIGNMENTS : has

    USERS {
      int id PK
      string name
      string email UK
      string password_hash
      string role
      boolean is_active
      datetime created_at
      datetime updated_at
    }

    TICKETS {
      int id PK
      string code UK
      int requester_id
      string title
      string description
      string priority
      string category
      string status
      datetime created_at
      datetime updated_at
    }

    ASSIGNMENTS {
      int id PK
      int ticket_id
      int agent_id
      int assigned_by
      string reason
      datetime assigned_at
      datetime created_at
    }
```

### 7.2 Entidades principales

1. Usuarios: identidad, rol y estado de activacion.
2. Tickets: incidente reportado, prioridad y ciclo de vida.
3. Asignaciones: relacion historica entre ticket y agente responsable.

## 8. Justificacion tecnologica

### 8.1 Backend

- Lenguaje: Node.js (LTS).
- Framework: Express.js.
- Justificacion: alta productividad, ecosistema maduro, coherencia con practicas previas.

### 8.2 Base de datos

- Motor: MySQL 8.0 (aislado por servicio).
- Justificacion: experiencia previa del equipo, soporte ACID, buen rendimiento en CRUD transaccional.

### 8.3 Bus de mensajeria

- Opcion elegida: RabbitMQ.
- Justificacion:
1. Enrutamiento flexible por exchange/routing key.
2. Menor complejidad operativa para eventos de negocio transaccionales.
3. Confirmaciones, durabilidad y dead-letter faciles de configurar.

### 8.4 Nube y orquestacion

- Orquestacion: K3s/Kubernetes.
- Proveedor sugerido: GCP (GKE) o DigitalOcean Kubernetes.
- Justificacion: estandar de mercado, escalado automatico y ecosistema robusto para observabilidad.

### 8.5 API y comunicacion entre servicios

- Estrategia: REST sincrono para consultas/comandos directos + eventos asincronos en RabbitMQ.
- Justificacion: menor complejidad inicial, facil trazabilidad, y migracion futura a gRPC sin romper contratos de dominio.

## 9. Gestion agil

### 9.1 Kanban propuesto

| Backlog | To Do | In Progress | Review | Done |
|---|---|---|---|---|
| RF/RNF faltantes | Definir contratos de eventos | Diagrama de arquitectura | Revision por equipo | Documento final integrado |
| Riesgos tecnicos | Diagrama de despliegue | Casos de uso expandidos | Ajustes de nomenclatura | Diagramas aprobados |
| Criterios de aceptacion | Modelo ER detallado | Matriz de decisiones tecnicas | Control de calidad | Entrega a repositorio |

### 9.2 Bitacora de trabajo

#### Dia 1
- Se levantaron requerimientos funcionales y no funcionales con enfoque de escalabilidad y asincronismo.
- Se delimitaron los bounded contexts: usuarios, tickets y asignaciones.
- Bloqueo: definicion de alcance exacto para notificaciones. Se resolvio dejandolo como consumidor secundario.

#### Dia 2
- Se elaboraron casos de uso de alto nivel y casos expandidos criticos.
- Se definieron eventos de dominio iniciales (`ticket.created`, `ticket.assigned`, `ticket.status.changed`).
- Bloqueo: versionamiento de eventos. Se resolvio con convencion `event_type:v1`.

#### Dia 3
- Se construyeron diagramas de arquitectura, despliegue, actividades y secuencia.
- Se completo el modelo ER y la justificacion de stack tecnologico.
- Se hizo revision cruzada para consistencia entre requerimientos, casos y modelo de datos.

## 10. Criterios de calidad de esta documentacion

1. Trazabilidad entre RF/RNF y artefactos de diseno.
2. Coherencia de nombres entre diagramas y entidades.
3. Arquitectura compatible con crecimiento y alta concurrencia.
4. Base para implementacion en la practica de desarrollo core.
