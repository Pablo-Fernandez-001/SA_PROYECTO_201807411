output "frontend_url_real" {
  description = "URL pública de Cloud Run"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "database_ip_real" {
  description = "IP pública de Cloud SQL"
  value       = google_sql_database_instance.mock_db.public_ip_address
}

output "gke_cluster_endpoint_real" {
  description = "IP del clúster de Kubernetes (GKE)"
  value       = google_container_cluster.primary.endpoint
}