resource "google_cloud_run_v2_service" "frontend" {
  name     = "${var.project_name}-frontend"
  location = var.gcp_region

  template {
    containers {
      image = "us-central1-docker.pkg.dev/proyecto-sa-492706/delivereats/frontend:v1.6" 
    }
  }
}

# Hacemos que la URL sea pública
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.frontend.location
  project  = google_cloud_run_v2_service.frontend.project
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}