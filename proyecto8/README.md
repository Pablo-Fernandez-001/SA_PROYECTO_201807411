# Practica 8 - Desarrollo Core (Mesa de Ayuda Orientada a Eventos)

## 1. Resumen

Implementacion core de tres microservicios independientes para un sistema de soporte tecnico:

- `users-service`
- `tickets-service`
- `assignments-service`
- `audit-service` (consumidor de eventos para trazabilidad)

Arquitectura aplicada:

- REST para comunicacion sincrona entre servicios.
- RabbitMQ para eventos de dominio asincronos.
- MySQL aislado por microservicio.
- Dockerfiles multi-stage y orquestacion con `docker-compose`.

## 2. Estructura

```text
proyecto8/
  db/
    users_db.sql
    tickets_db.sql
    assignments_db.sql
  users-service/
    Dockerfile
    package.json
    src/
      config/
      controllers/
      services/
      repositories/
      models/
      routes/
      events/
      index.js
  tickets-service/
    Dockerfile
    package.json
    src/...
  assignments-service/
    Dockerfile
    package.json
    src/...
  audit-service/
    Dockerfile
    package.json
    src/
      index.js
  scripts/
    dev-up.ps1
    dev-down.ps1
    smoke-test.ps1
    smoke-test.sh
  docker-compose.yml
  README.md
```

## 3. Ejecucion local

### 3.1 Requisitos

1. Docker y Docker Compose instalados.
2. Puerto libre: `3101`, `3102`, `3103`, `3401`, `3402`, `3403`, `5672`, `15672`.

### 3.2 Levantar el ecosistema

```bash
docker-compose up --build
```

Servicios expuestos:

- Users API: `http://localhost:3101/api`
- Tickets API: `http://localhost:3102/api`
- Assignments API: `http://localhost:3103/api`
- Audit API: `http://localhost:3104/api`
- RabbitMQ UI: `http://localhost:15672` (user: `helpdesk`, pass: `helpdesk123`)

Comandos auxiliares en Windows PowerShell:

```powershell
.\scripts\dev-up.ps1
.\scripts\smoke-test.ps1
.\scripts\dev-down.ps1
```

Pruebas automatizadas (incluye Cypress):

```bash
npm install
npm run test:smoke:ps
npm run test:api:cypress
npm run test:all
```

## 4. Endpoints CRUD

### 4.1 users-service

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/health`

### 4.2 tickets-service

- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/:id`
- `PUT /api/tickets/:id`
- `DELETE /api/tickets/:id`
- `GET /api/health`

Filtros:

- `GET /api/tickets?status=OPEN`
- `GET /api/tickets?requester_id=1`

### 4.3 assignments-service

- `POST /api/assignments`
- `GET /api/assignments`
- `GET /api/assignments/:id`
- `PUT /api/assignments/:id`
- `DELETE /api/assignments/:id`
- `GET /api/health`

Filtros:

- `GET /api/assignments?agent_id=2`
- `GET /api/assignments?ticket_id=1`
- `GET /api/assignments?is_active=true`

## 5. Flujo funcional recomendado para prueba manual

1. Listar usuarios y tomar un `requester` y un `agent`.
2. Crear ticket con `requester_id` valido.
3. Crear asignacion con `ticket_id`, `agent_id` y `assigned_by`.
4. Verificar que el ticket cambio a estado `ASSIGNED`.
5. Consultar listas y detalle de asignaciones.

Ejemplo rapido:

```bash
curl -X POST http://localhost:3102/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "requester_id": 3,
    "title": "No puedo acceder al VPN",
    "description": "El cliente de VPN muestra error de autenticacion intermitente",
    "priority": "HIGH",
    "category": "Network"
  }'
```

## 6. Eventos de dominio publicados

- `users-service`:
  - `user.created`
  - `user.updated`
  - `user.deleted`
- `tickets-service`:
  - `ticket.created`
  - `ticket.updated`
  - `ticket.status.changed`
  - `ticket.deleted`
- `assignments-service`:
  - `ticket.assigned`
  - `assignment.updated`
  - `assignment.deleted`
- `audit-service`:
  - consume `#` (todos los routing keys) y expone buffer en `GET /api/events`

Exchange RabbitMQ: `helpdesk.events` (`topic`).

## 7. Evidencia de principios SOLID

### 7.1 Single Responsibility Principle (SRP)

- Controladores solo gestionan HTTP.
- Servicios solo ejecutan reglas de negocio.
- Repositorios solo hacen acceso a datos.
- Clientes externos encapsulan llamadas entre servicios.

Archivos ejemplo:

- `users-service/src/controllers/userController.js`
- `users-service/src/services/userService.js`
- `users-service/src/repositories/userRepository.js`
- `assignments-service/src/services/externalClients.js`

### 7.2 Open/Closed Principle (OCP)

- Las reglas de validacion y logica de negocio se extienden agregando nuevas clases o metodos sin modificar la capa HTTP.
- Los clientes externos permiten agregar otra fuente sin cambiar el servicio principal (adaptadores).

### 7.3 Liskov Substitution Principle (LSP)

- El codigo depende de contratos de metodos (`findById`, `create`, `update`) y no de implementaciones concretas, permitiendo reemplazar repositorios con otra tecnologia.

### 7.4 Interface Segregation Principle (ISP)

- Los servicios dependen de interfaces pequenas de infraestructura (clientes y repositorios), evitando dependencias monoliticas.

### 7.5 Dependency Inversion Principle (DIP)

- En cada `index.js` se realiza composicion de dependencias e inyeccion hacia servicios.
- Las clases de negocio no construyen directamente conexiones o librerias externas.

## 8. Gestion agil (Sprint 2)

### 8.1 Tablero Kanban (estado final)

| To Do | In Progress | Review | Done |
|---|---|---|---|
| Hardening de auth | - | - | Arquitectura base de servicios |
| Integrar notificaciones | - | - | CRUD users-service |
| Observabilidad avanzada | - | - | CRUD tickets-service |
| Pruebas E2E extendidas | - | - | CRUD assignments-service |
| Despliegue K3s | - | - | Dockerfiles multi-stage |
| - | - | - | Compose completo + DB aisladas |
| - | - | - | Validacion de flujo ticket -> asignacion |

### 8.2 Dailys del sprint

#### Daily 1
- Ayer: Definimos contratos de API y eventos para users, tickets y assignments.
- Hoy: Implementar repositorios y validaciones de users/tickets.
- Bloqueo: Validar requester remoto desde tickets-service.
- Accion: Implementar cliente HTTP resiliente con timeout y manejo de 404.

#### Daily 2
- Ayer: Se completaron CRUD de users y tickets con publicacion de eventos.
- Hoy: Implementar assignments con validacion de ticket/agente y cambio de estado.
- Bloqueo: Evitar multiples asignaciones activas por ticket.
- Accion: Desactivar asignaciones activas previas antes de crear una nueva.

#### Daily 3
- Ayer: Se completo assignments-service y compose general.
- Hoy: Integracion final, pruebas manuales y documentacion de SOLID/Kanban.
- Bloqueo: Ninguno critico.
- Accion: Validacion end-to-end y cierre de entregable.

## 9. Justificacion de REST vs gRPC para esta fase

Se eligio REST para comunicacion interna en el core por:

1. Menor friccion de desarrollo inicial y debugging rapido.
2. Coherencia con CRUD y herramientas de prueba manual.
3. Preparacion gradual del dominio antes de optimizar transporte.

El diseno queda preparado para evolucion a gRPC en fases posteriores porque:

1. Las dependencias estan encapsuladas en clientes (`externalClients.js`, `userClient.js`).
2. La logica de negocio no depende del protocolo.
3. Los eventos de dominio ya desacoplan componentes para cargas asincronas.

## 10. Seguridad y datos sensibles

1. No se exponen secretos en Dockerfiles.
2. Variables sensibles se inyectan por entorno en compose.
3. Bases de datos aisladas por servicio para menor impacto de seguridad.

## 11. Endpoints de operabilidad

Cada servicio backend expone:

1. `GET /api/health` (liveness)
2. `GET /api/health/deep` (verifica conectividad real con MySQL)

Adicionalmente:

1. `GET /api/events` en audit-service para visualizar eventos de dominio procesados.

## 12. Estado final

- Microservicios implementados y funcionales.
- CRUD completo para Usuarios, Tickets y Asignaciones.
- Publicacion de eventos lista para consumidores.
- Compose listo para ejecutar `docker-compose up --build`.
- Smoke test E2E automatizado aprobado.
- Cypress E2E API aprobado.
