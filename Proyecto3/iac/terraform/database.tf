resource "google_sql_database_instance" "mock_db" {
  name             = "${var.project_name}-db-sa-v1"
  # Cambiado a MySQL 8.0 (la versión más común actualmente)
  database_version = "MYSQL_8_0" 
  region           = var.gcp_region
  
  # Crucial para poder correr "terraform destroy" sin errores en entornos de prueba
  deletion_protection = false 

  settings {
    # db-f1-micro es la máquina más pequeña (ideal para desarrollo/capa gratuita)
    tier = "db-f1-micro" 
    
    # Opcional: Recomendado para MySQL para asegurar que acepte conexiones
    ip_configuration {
      ipv4_enabled = true
    }
  }
}

# Lista de bases de datos basadas en tus archivos SQL
variable "db_names" {
  type    = list(string)
  default = ["catalog_db", "delivery_db", "orders_db", "payment_db", "auth_db"]
}

# Crear las bases de datos lógicas
resource "google_sql_database" "microservices_databases" {
  for_each = toset(var.db_names)

  name     = each.value
  instance = google_sql_database_instance.mock_db.name
}

# Crear un usuario específico para los microservicios
resource "google_sql_user" "db_user" {
  name     = "delivereats_user"
  instance = google_sql_database_instance.mock_db.name
  password = "delivereats2024@S@"
}