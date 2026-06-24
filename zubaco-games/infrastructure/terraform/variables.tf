variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "zubaco.com"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.small"
}

variable "ecs_desired_count" {
  description = "ECS desired task count for platform service"
  type        = number
  default     = 2
}

variable "game_services_count" {
  description = "Number of game backend services"
  type        = number
  default     = 20
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = "devops@zubaco.com"
}
