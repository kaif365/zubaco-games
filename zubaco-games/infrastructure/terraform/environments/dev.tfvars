# ╔══════════════════════════════════════════════════════════════╗
# ║  Zubaco — Development Environment                          ║
# ╚══════════════════════════════════════════════════════════════╝

environment = "dev"
aws_region  = "ap-south-1"
domain_name = "dev.zubaco.com"

# ─── Database (small, single-AZ) ─────────────────────────────
db_instance_class    = "db.t3.micro"
db_multi_az          = false
db_read_replica      = false
db_backup_retention  = 1
db_max_storage       = 50

# ─── Redis (minimal) ─────────────────────────────────────────
redis_node_type      = "cache.t3.micro"
redis_num_clusters   = 1
redis_failover       = false

# ─── ECS (minimal footprint) ─────────────────────────────────
ecs_desired_count    = 1
ecs_min_capacity     = 1
ecs_max_capacity     = 2
ecs_cpu              = 256
ecs_memory           = 512

# ─── Scaling ──────────────────────────────────────────────────
enable_pgbouncer     = false
enable_read_replica  = false
enable_vpc_endpoints = false
enable_waf           = false
enable_dashboard     = false

# ─── Retention ────────────────────────────────────────────────
log_retention_days   = 3
alert_email          = "dev@zubaco.com"
