resource "google_container_cluster" "primary" {
  name     = "${var.project_name}-gke"
  location = "us-central1-a" 
  
  network  = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  remove_default_node_pool = true
  initial_node_count       = 1
  
  deletion_protection = false 
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.project_name}-node-pool"
  location   = "us-central1-a" 
  cluster    = google_container_cluster.primary.name
  
  # 2 nodos en esta única zona nos darán los 8 vCPUs que necesitamos
  node_count = 2

  node_config {
    machine_type = "e2-standard-4" 
    
    # Reducimos a 40GB y forzamos disco estándar (magnético) para no tocar tu cuota SSD
    disk_size_gb = 40
    disk_type    = "pd-standard"
    
    labels = {
      environment = "mock-production"
    }
  }
}