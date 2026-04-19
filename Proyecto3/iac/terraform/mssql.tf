resource "google_compute_instance" "mssql_server" {
  name         = "${var.project_name}-mssql"
  machine_type = "e2-standard-2"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "windows-cloud/windows-server-2022-dc-v20260409"
      size  = 100
      type  = "pd-standard"
    }
  }

  network_interface {
    network    = google_compute_network.vpc.name
    subnetwork = google_compute_subnetwork.subnet.name

    access_config {}
  }

  tags = ["mssql", "database"]

  metadata = {
    windows-startup-script-ps1 = <<-EOT
      Write-Host "Install MS SQL Server manually or via domain-specific bootstrap"
    EOT
  }
}

resource "google_compute_firewall" "allow_mssql" {
  name    = "${var.project_name}-allow-mssql"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["1433"]
  }

  source_ranges = ["10.0.0.0/8"]
  target_tags    = ["mssql"]
}
