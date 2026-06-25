# ╔══════════════════════════════════════════════════════════════╗
# ║  Zubaco — QA Environment                                   ║
# ╚══════════════════════════════════════════════════════════════╝

environment = "qa"
aws_region  = "ap-south-1"
domain_name = "qa.zubaco.com"

# ─── Database (small, single-AZ) ─────────────────────────────
db_instance_class    = "db.t3.small"
db_multi_az          = false
db_read_replica      = false
db_backup_retention  = 3
db_max_storage       = 50

# ─── Redis ────────────────────────────────────────────────────
redis_node_type      = "cache.t3.micro"
redis_num_clusters   = 1
redis_failover       = false

# ─── ECS ──────────────────────────────────────────────────────
ecs_desired_count    = 1
ecs_min_capacity     = 1
ecs_max_capacity     = 3
ecs_cpu              = 512
ecs_memory           = 1024

# ─── Scaling ──────────────────────────────────────────────────
enable_pgbouncer     = false
enable_read_replica  = false
enable_vpc_endpoints = false
enable_waf           = false
enable_dashboard     = false

# ─── Retention ────────────────────────────────────────────────
log_retention_days   = 7
alert_email          = "qa@zubaco.com"
