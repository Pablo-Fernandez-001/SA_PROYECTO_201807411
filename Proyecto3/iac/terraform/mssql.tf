resource "google_compute_instance" "mssql_server" {
  name         = "${var.project_name}-mssql"
  machine_type = "e2-standard-2"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
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
    startup-script = <<-EOT
      #!/bin/bash
      set -euxo pipefail

      apt-get update -y
      apt-get install -y docker.io
      systemctl enable docker
      systemctl start docker

      docker pull mcr.microsoft.com/mssql/server:2022-latest
      docker rm -f delivereats-mssql || true
      docker run -d --name delivereats-mssql \
        -e "ACCEPT_EULA=Y" \
        -e "MSSQL_SA_PASSWORD=DeliverEats!2026" \
        -p 1433:1433 \
        --restart unless-stopped \
        mcr.microsoft.com/mssql/server:2022-latest
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
