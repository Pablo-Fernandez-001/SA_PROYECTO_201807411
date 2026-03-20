# Requerimientos Funcionales - DeliverEats Fase 2
## Versión 1.1.0 - Actualizado para Práctica 4

---

## 1. Módulo de Autenticación y Usuarios

### RF-01: Registro de Usuario Cliente
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir el registro público de usuarios con rol CLIENTE sin requerir autenticación previa.

**Criterios de Aceptación:**
- El usuario debe proporcionar: nombre, email (único), contraseña
- La contraseña debe ser encriptada con bcrypt (12 rounds mínimo)
- El sistema debe validar formato de email
- El rol asignado por defecto es CLIENTE
- El sistema debe retornar error si el email ya existe

**Entrada:** `{ "name": "string", "email": "string", "password": "string" }`  
**Salida:** `{ "success": true, "message": "Usuario registrado exitosamente" }`

---

### RF-02: Registro de Usuarios con Roles Especiales
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a un ADMINISTRADOR registrar usuarios con roles RESTAURANTE, REPARTIDOR, ADMIN.

**Criterios de Aceptación:**
- Solo usuarios con rol ADMIN pueden crear estos usuarios
- Requiere autenticación con JWT válido
- El JWT debe contener el rol ADMIN
- Se deben aplicar las mismas validaciones que RF-01

**Entrada:** `{ "name": "string", "email": "string", "password": "string", "role": "RESTAURANTE|REPARTIDOR|ADMIN" }`  
**Salida:** `{ "success": true, "userId": "uuid", "message": "Usuario creado" }`

---

### RF-03: Inicio de Sesión
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a cualquier usuario autenticarse con email y contraseña.

**Criterios de Aceptación:**
- El sistema debe validar credenciales contra la base de datos
- Si las credenciales son válidas, debe generar un JWT con expiración de 24 horas
- El JWT debe contener: userId, email, role
- El sistema debe retornar error 401 si las credenciales son inválidas

**Entrada:** `{ "email": "string", "password": "string" }`  
**Salida:** `{ "success": true, "token": "jwt_string", "user": { "id": "uuid", "name": "string", "email": "string", "role": "string" } }`

---

### RF-04: Gestión de Usuarios (CRUD)
**Prioridad:** Media  
**Descripción:** El sistema debe permitir a los ADMINISTRADORES listar, actualizar y eliminar usuarios.

**Criterios de Aceptación:**
- **Listar:** Retornar todos los usuarios sin contraseñas
- **Actualizar:** Permitir cambiar nombre, email, rol (no contraseña por esta vía)
- **Eliminar:** Eliminar usuario por ID (validar que no sea el mismo admin)

---

## 2. Módulo de Catálogo de Restaurantes

### RF-05: Gestión de Restaurantes (CRUD)
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a los ADMINISTRADORES crear, listar, actualizar y eliminar restaurantes.

**Criterios de Aceptación:**
- **Crear:** Nombre, descripción, dirección, teléfono, ownerId (usuario con rol RESTAURANTE)
- **Listar:** Todos los usuarios pueden ver restaurantes activos
- **Actualizar:** Solo ADMIN puede modificar datos del restaurante
- **Eliminar:** Solo ADMIN puede eliminar (soft delete recomendado)

**Entrada (Crear):** `{ "name": "string", "description": "string", "address": "string", "phone": "string", "ownerId": "uuid" }`  
**Salida:** `{ "success": true, "restaurantId": "uuid" }`

---

### RF-06: Gestión de Ítems del Menú (CRUD)
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir a usuarios con rol RESTAURANTE gestionar los ítems del menú de su restaurante.

**Criterios de Aceptación:**
- **Crear:** nombre, descripción, precio, restaurantId, disponibilidad
- **Listar:** Todos los usuarios pueden ver menús
- **Actualizar:** Solo el owner del restaurante puede actualizar sus ítems
- **Eliminar:** Solo el owner puede eliminar ítems

**Entrada (Crear):** `{ "name": "string", "description": "string", "price": "decimal", "restaurantId": "uuid", "available": "boolean" }`  
**Salida:** `{ "success": true, "itemId": "uuid" }`

---

### RF-07: Consulta Pública de Restaurantes
**Prioridad:** Alta  
**Descripción:** Cualquier usuario (incluso sin autenticación) debe poder ver la lista de restaurantes disponibles.

**Criterios de Aceptación:**
- Retornar lista de restaurantes con: id, nombre, descripción, dirección
- Filtrar solo restaurantes activos
- No requiere autenticación

**Salida:** `[{ "id": "uuid", "name": "string", "description": "string", "address": "string" }]`

---

### RF-08: Consulta de Menú por Restaurante
**Prioridad:** Alta  
**Descripción:** Cualquier usuario debe poder ver el menú completo de un restaurante específico.

**Criterios de Aceptación:**
- Filtrar solo ítems disponibles
- Incluir: nombre, descripción, precio
- No requiere autenticación

**Entrada:** `restaurantId`  
**Salida:** `[{ "id": "uuid", "name": "string", "description": "string", "price": "decimal", "available": "boolean" }]`

---

## 3. Módulo de Órdenes

### RF-09: Crear Orden
**Prioridad:** Alta  
**Descripción:** Un usuario CLIENTE debe poder crear una orden seleccionando ítems de un restaurante.

**Criterios de Aceptación:**
- Requiere autenticación con JWT (rol CLIENTE)
- Validar que todos los ítems pertenezcan al mismo restaurante
- Validar disponibilidad de ítems
- Calcular total automáticamente
- Estado inicial: CREADA
- **[FASE 2]** Publicar mensaje en cola RabbitMQ/Kafka para notificar al Restaurant-Service

**Entrada:** `{ "restaurantId": "uuid", "items": [{ "itemId": "uuid", "quantity": "integer" }], "deliveryAddress": "string" }`  
**Salida:** `{ "success": true, "orderId": "uuid", "total": "decimal", "status": "CREADA" }`

---

### RF-10: Cancelar Orden (Cliente)
**Prioridad:** Media  
**Descripción:** Un CLIENTE debe poder cancelar una orden que esté en estado CREADA o EN PROCESO.

**Criterios de Aceptación:**
- Solo el cliente que creó la orden puede cancelarla
- Solo se puede cancelar si el estado es CREADA o EN PROCESO
- El nuevo estado es CANCELADO
- Se debe enviar notificación por email

**Entrada:** `orderId`  
**Salida:** `{ "success": true, "message": "Orden cancelada" }`

---

### RF-11: Recibir Orden (Restaurante)
**Prioridad:** Alta  
**Descripción:** Un usuario RESTAURANTE debe poder aceptar una orden asignada a su restaurante.

**Criterios de Aceptación:**
- Solo el owner del restaurante puede aceptar
- El estado cambia de CREADA a EN PROCESO
- **[FASE 2]** Consumir mensaje de cola y procesar orden
- Se debe enviar notificación por email al cliente

**Entrada:** `orderId`  
**Salida:** `{ "success": true, "message": "Orden aceptada", "status": "EN PROCESO" }`

---

### RF-12: Rechazar Orden (Restaurante)
**Prioridad:** Media  
**Descripción:** Un RESTAURANTE debe poder rechazar una orden si no puede prepararla.

**Criterios de Aceptación:**
- Solo el owner del restaurante puede rechazar
- El estado cambia a RECHAZADA
- Se debe enviar notificación por email al cliente

**Entrada:** `orderId`  
**Salida:** `{ "success": true, "message": "Orden rechazada", "status": "RECHAZADA" }`

---

### RF-13: Marcar Orden como Finalizada
**Prioridad:** Alta  
**Descripción:** El sistema debe permitir marcar una orden como FINALIZADO cuando se complete la preparación.

**Criterios de Aceptación:**
- Solo el owner del restaurante puede marcar como finalizada
- El estado previo debe ser EN PROCESO
- El nuevo estado es FINALIZADO
- Se debe notificar al Delivery-Service para asignación de repartidor

---

## 4. Módulo de Delivery

### RF-14: Aceptar Pedido para Entrega
**Prioridad:** Alta  
**Descripción:** Un REPARTIDOR debe poder aceptar una orden en estado FINALIZADO para iniciar la entrega.

**Criterios de Aceptación:**
- Requiere autenticación con JWT (rol REPARTIDOR)
- El estado cambia a EN CAMINO
- Se debe enviar notificación por email al cliente

**Entrada:** `{ "orderId": "uuid", "deliveryPersonId": "uuid" }`  
**Salida:** `{ "success": true, "deliveryId": "uuid", "status": "EN CAMINO" }`

---

### RF-15: Marcar Orden como Entregada
**Prioridad:** Alta  
**Descripción:** Un REPARTIDOR debe poder marcar una orden como ENTREGADO cuando complete la entrega.

**Criterios de Aceptación:**
- Solo el repartidor asignado puede marcar como entregado
- El estado cambia a ENTREGADO
- Se debe registrar fecha y hora de entrega
- Se debe enviar notificación por email al cliente

**Entrada:** `orderId`  
**Salida:** `{ "success": true, "message": "Orden entregada exitosamente" }`

---

### RF-16: Cancelar Entrega
**Prioridad:** Baja  
**Descripción:** Un REPARTIDOR debe poder cancelar una entrega asignada en casos excepcionales.

**Criterios de Aceptación:**
- Solo el repartidor asignado puede cancelar
- El estado vuelve a FINALIZADO para reasignación
- Se debe enviar notificación por email al restaurante y cliente

---

## 5. Módulo de Notificaciones

### RF-17: Notificación de Orden Creada
**Prioridad:** Media  
**Descripción:** El sistema debe enviar un correo electrónico al cliente y al restaurante cuando se crea una orden.

**Criterios de Aceptación:**
- Email al cliente: confirmación de orden con detalles (número, ítems, total)
- Email al restaurante: nueva orden pendiente de aceptación
- Incluir información: nombre cliente, número orden, productos, fecha, total

---

### RF-18: Notificación de Orden Cancelada
**Prioridad:** Media  
**Descripción:** El sistema debe enviar notificación cuando una orden sea cancelada.

**Criterios de Aceptación:**
- Si cancela el cliente: notificar al restaurante
- Si cancela el repartidor: notificar al cliente y restaurante
- Incluir razón de cancelación (si aplica)

---

### RF-19: Notificación de Orden en Camino
**Prioridad:** Alta  
**Descripción:** El sistema debe notificar al cliente cuando su orden esté en camino.

**Criterios de Aceptación:**
- Email al cliente con datos del repartidor (nombre, teléfono si aplica)
- Incluir tiempo estimado de entrega

---

### RF-20: Notificación de Orden Rechazada
**Prioridad:** Media  
**Descripción:** El sistema debe notificar al cliente cuando un restaurante rechace su orden.

**Criterios de Aceptación:**
- Email al cliente explicando que la orden fue rechazada por el restaurante
- Sugerir opciones alternativas

---

## 6. Estados de Orden - Máquina de Estados

```
CREADA → EN PROCESO (Restaurante acepta)
CREADA → RECHAZADA (Restaurante rechaza)
CREADA → CANCELADO (Cliente cancela)
EN PROCESO → FINALIZADO (Restaurante completa)
EN PROCESO → CANCELADO (Cliente cancela)
FINALIZADO → EN CAMINO (Repartidor acepta)
EN CAMINO → ENTREGADO (Repartidor entrega)
EN CAMINO → CANCELADO (Repartidor cancela)
```

---

## 7. Comunicación Asíncrona (Fase 2 - RabbitMQ/Kafka)

### RF-21: Publicar Evento de Orden Creada
**Prioridad:** Alta  
**Descripción:** Cuando se crea una orden, el Order-Service debe publicar un mensaje en la cola de mensajes.

**Criterios de Aceptación:**
- El mensaje debe contener: orderId, restaurantId, items, total, customerInfo
- El mensaje debe publicarse en una cola/topic llamada `orders.created`
- El Order-Service debe recibir confirmación de publicación exitosa

---

### RF-22: Consumir Evento de Orden Creada
**Prioridad:** Alta  
**Descripción:** El Catalog-Service (Restaurant-Service) debe consumir mensajes de órdenes creadas.

**Criterios de Aceptación:**
- El servicio debe escuchar la cola `orders.created`
- Al recibir un mensaje, debe registrarlo/imprimirlo en consola
- **[PoC]** En esta fase solo se valida la comunicación, no se procesa lógica de negocio completa

---

## 8. Resumen de Roles y Permisos

| Funcionalidad | ADMIN | CLIENTE | RESTAURANTE | REPARTIDOR |
|--------------|-------|---------|-------------|------------|
| Registrarse (público) | ✅ | ✅ | ❌ | ❌ |
| Crear usuarios con roles | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| Gestionar restaurantes | ✅ | ❌ | ❌ | ❌ |
| Gestionar menú propio | ❌ | ❌ | ✅ | ❌ |
| Ver restaurantes/menús | ✅ | ✅ | ✅ | ✅ |
| Crear orden | ❌ | ✅ | ❌ | ❌ |
| Cancelar orden propia | ❌ | ✅ | ❌ | ❌ |
| Aceptar/Rechazar orden | ❌ | ❌ | ✅ | ❌ |
| Aceptar entrega | ❌ | ❌ | ❌ | ✅ |
| Marcar como entregado | ❌ | ❌ | ❌ | ✅ |

---

## 9. Criterios de Validación

Todos los requerimientos funcionales deben cumplir:
- **Validación de entrada:** Todos los campos requeridos deben estar presentes
- **Manejo de errores:** Respuestas HTTP apropiadas (200, 201, 400, 401, 403, 404, 500)
- **Autenticación:** Validar JWT en endpoints protegidos
- **Autorización:** Validar roles apropiados para cada operación
- **Logging:** Registrar todas las operaciones críticas
- **Auditoría:** Registrar fecha/hora de creación y modificación

---

**Fecha de actualización:** 23 de febrero de 2026  
**Versión:** 1.1.0  
**Estado:** Fase 2 - En desarrollo
