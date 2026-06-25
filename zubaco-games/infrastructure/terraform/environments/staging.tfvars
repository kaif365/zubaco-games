# ╔══════════════════════════════════════════════════════════════╗
# ║  Zubaco — Staging Environment (production-like)            ║
# ╚══════════════════════════════════════════════════════════════╝

environment = "staging"
aws_region  = "ap-south-1"
domain_name = "staging.zubaco.com"

# ─── Database (production-like, single-AZ) ───────────────────
db_instance_class    = "db.t3.medium"
db_multi_az          = false
db_read_replica      = true
db_backup_retention  = 7
db_max_storage       = 100

# ─── Redis (production-like) ─────────────────────────────────
redis_node_type      = "cache.t3.small"
redis_num_clusters   = 2
redis_failover       = true

# ─── ECS ──────────────────────────────────────────────────────
ecs_desired_count    = 2
ecs_min_capacity     = 2
ecs_max_capacity     = 5
ecs_cpu              = 1024
ecs_memory           = 2048

# ─── Scaling ──────────────────────────────────────────────────
enable_pgbouncer     = true
enable_read_replica  = true
enable_vpc_endpoints = true
enable_waf           = true
enable_dashboard     = true

# ─── Retention ────────────────────────────────────────────────
log_retention_days   = 14
alert_email          = "staging@zubaco.com"
