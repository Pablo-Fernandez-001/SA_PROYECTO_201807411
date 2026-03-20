# Comandos Útiles - DeliverEats

Guía rápida de comandos para desarrollo y debugging del sistema.

---

## Desde Windows PowerShell

### Ver Usuarios (Básico)
```powershell
wsl bash -c "docker exec delivereats-auth-db mysql -uroot -ppassword -e 'SELECT * FROM auth_db.users;' 2>&1 | grep -v Warning"
```

### Ver Usuarios (Con Roles)
```powershell
wsl bash -c "docker exec delivereats-auth-db mysql -uroot -ppassword auth_db -e 'SELECT u.id, u.name, u.email, r.name as role, u.is_active FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id;'"
```

### Verificar Configuración JWT
```powershell
wsl bash -c "docker exec delivereats-auth-service printenv | grep JWT"
```

### Conectar a Base de Datos (Interactivo)
```powershell
wsl bash -c "docker exec -it delivereats-auth-db mysql -uroot -ppassword auth_db"
```

### Logs en Tiempo Real - Auth Service
```powershell
wsl bash -c "docker logs delivereats-auth-service -f"
```

### Logs en Tiempo Real - API Gateway
```powershell
wsl bash -c "docker logs delivereats-api-gateway -f"
```

### Logs en Tiempo Real - Frontend
```powershell
wsl bash -c "docker logs delivereats-frontend -f"
```

---

## Desde WSL Nativo

### Ver Usuarios (Básico)
```bash
docker exec delivereats-auth-db mysql -uroot -ppassword -e 'SELECT * FROM auth_db.users;' 2>&1 | grep -v Warning
```

### Ver Usuarios (Con Roles)
```bash
docker exec delivereats-auth-db mysql -uroot -ppassword auth_db -e 'SELECT u.id, u.name, u.email, r.name as role, u.is_active FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id;'
```

### Verificar Configuración JWT
```bash
docker exec delivereats-auth-service printenv | grep JWT
```

### Conectar a Base de Datos (Interactivo)
```bash
docker exec -it delivereats-auth-db mysql -uroot -ppassword auth_db
```

### Logs en Tiempo Real - Auth Service
```bash
docker logs delivereats-auth-service -f
```

### Logs en Tiempo Real - API Gateway
```bash
docker logs delivereats-api-gateway -f
```

### Logs en Tiempo Real - Frontend
```bash
docker logs delivereats-frontend -f
```

---

## Comandos Adicionales de Docker

### Desde Windows PowerShell

#### Ver Estado de Contenedores
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose ps"
```

#### Reiniciar Servicios
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose restart"
```

#### Reiniciar Servicio Específico
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose restart auth-service"
```

#### Ver Logs de Todos los Servicios
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose logs -f"
```

#### Detener Todo
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose down"
```

#### Reset Completo (Elimina volúmenes)
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose down -v && docker compose up -d"
```

#### Rebuild y Restart
```powershell
wsl bash -c "cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2 && docker compose up --build -d"
```

### Desde WSL Nativo

#### Ver Estado de Contenedores
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose ps
```

#### Reiniciar Servicios
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose restart
```

#### Reiniciar Servicio Específico
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose restart auth-service
```

#### Ver Logs de Todos los Servicios
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose logs -f
```

#### Detener Todo
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose down
```

#### Reset Completo (Elimina volúmenes)
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose down -v
docker compose up -d
```

#### Rebuild y Restart
```bash
cd /mnt/c/Users/pabda/OneDrive/Escritorio/SA/Practica2
docker compose up --build -d
```

---

## Consultas SQL Útiles

### Ver Todos los Roles
```sql
SELECT * FROM auth_db.roles;
```

### Ver Usuarios por Rol
```sql
SELECT r.name as rol, COUNT(u.id) as cantidad 
FROM auth_db.roles r 
LEFT JOIN auth_db.users u ON r.id = u.role_id 
GROUP BY r.id, r.name;
```

### Ver Usuarios Activos
```sql
SELECT u.id, u.name, u.email, r.name as role 
FROM auth_db.users u 
JOIN auth_db.roles r ON u.role_id = r.id 
WHERE u.is_active = TRUE;
```

### Ver Usuarios Inactivos
```sql
SELECT u.id, u.name, u.email, r.name as role 
FROM auth_db.users u 
JOIN auth_db.roles r ON u.role_id = r.id 
WHERE u.is_active = FALSE;
```

### Ver Últimos Usuarios Registrados
```sql
SELECT u.id, u.name, u.email, r.name as role, u.created_at 
FROM auth_db.users u 
JOIN auth_db.roles r ON u.role_id = r.id 
ORDER BY u.created_at DESC 
LIMIT 5;
```

### Activar Usuario
```sql
UPDATE auth_db.users SET is_active = TRUE WHERE id = <USER_ID>;
```

### Desactivar Usuario
```sql
UPDATE auth_db.users SET is_active = FALSE WHERE id = <USER_ID>;
```

---

## Testing con cURL

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delivereats.com","password":"admin123"}'
```

### Registro
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"CLIENTE"}'
```

### Ver Usuarios (requiere token admin)
```bash
curl -X GET http://localhost:8080/api/auth/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Health Check
```bash
curl http://localhost:8080/api/health
```

---

## Ejecutar Consultas SQL desde PowerShell

### Windows PowerShell
```powershell
wsl bash -c "docker exec delivereats-auth-db mysql -uroot -ppassword auth_db -e 'TU_CONSULTA_SQL_AQUI'"
```

### Ejemplo: Contar usuarios
```powershell
wsl bash -c "docker exec delivereats-auth-db mysql -uroot -ppassword auth_db -e 'SELECT COUNT(*) as total FROM users;'"
```

---

## Ejecutar Consultas SQL desde WSL

### WSL Nativo
```bash
docker exec delivereats-auth-db mysql -uroot -ppassword auth_db -e 'TU_CONSULTA_SQL_AQUI'
```

### Ejemplo: Contar usuarios
```bash
docker exec delivereats-auth-db mysql -uroot -ppassword auth_db -e 'SELECT COUNT(*) as total FROM users;'
```

---

## Troubleshooting

### Ver recursos de Docker
```bash
docker stats
```

### Ver redes de Docker
```bash
docker network ls
docker network inspect delivereats_delivereats-network
```

### Inspeccionar contenedor
```bash
docker inspect delivereats-auth-service
```

### Entrar a un contenedor
```bash
docker exec -it delivereats-auth-service sh
```

### Ver volúmenes
```bash
docker volume ls
docker volume inspect delivereats_mysql-data
```

---

## Notas

- **Credenciales DB:** root / password
- **JWT Secret:** delivereats_super_secret_jwt_key_2024
- **Puertos:**
  - Frontend: 3000
  - API Gateway: 8080
  - Auth Service: 50051
  - MySQL: 3306

- **Suprimir warnings de MySQL:** Agregar `2>&1 | grep -v Warning` al final del comando
