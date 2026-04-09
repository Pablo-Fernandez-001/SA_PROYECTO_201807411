variable "project_id" {
  description = "ID del proyecto de GCP"
  type        = string
  default     = "proyecto-sa-492706" 
}

variable "gcp_region" {
  description = "Región de GCP"
  type        = string
  default     = "us-central1"
}

variable "project_name" {
  description = "Nombre base para los recursos"
  type        = string
  default     = "proyecto-iac"
}