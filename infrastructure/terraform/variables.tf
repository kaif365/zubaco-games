variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev, qa, staging, production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "zubaco.com"
}

# ─── Database ─────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_multi_az" {
  description = "Enable multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "db_read_replica" {
  description = "Create a read replica"
  type        = bool
  default     = false
}

variable "db_backup_retention" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_max_storage" {
  description = "Maximum auto-scaling storage in GB"
  type        = number
  default     = 200
}

# ─── Redis ────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.small"
}

variable "redis_num_clusters" {
  description = "Number of Redis cache clusters (replicas)"
  type        = number
  default     = 1
}

variable "redis_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = false
}

# ─── ECS ──────────────────────────────────────────────────────

variable "ecs_desired_count" {
  description = "ECS desired task count for platform service"
  type        = number
  default     = 2
}

variable "ecs_min_capacity" {
  description = "Minimum ECS task count for auto-scaling"
  type        = number
  default     = 1
}

variable "ecs_max_capacity" {
  description = "Maximum ECS task count for auto-scaling"
  type        = number
  default     = 10
}

variable "ecs_cpu" {
  description = "ECS task CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 1024
}

# ─── Feature Toggles ─────────────────────────────────────────

variable "enable_pgbouncer" {
  description = "Deploy PgBouncer as connection pooler"
  type        = bool
  default     = false
}

variable "enable_read_replica" {
  description = "Create an RDS read replica for analytics queries"
  type        = bool
  default     = false
}

variable "enable_vpc_endpoints" {
  description = "Create VPC endpoints for AWS services (reduces NAT costs)"
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Enable WAF on ALB"
  type        = bool
  default     = true
}

variable "enable_dashboard" {
  description = "Create CloudWatch dashboard"
  type        = bool
  default     = false
}

# ─── Operational ──────────────────────────────────────────────

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "devops@zubaco.com"
}

variable "game_services_count" {
  description = "Number of game backend services"
  type        = number
  default     = 20
}
