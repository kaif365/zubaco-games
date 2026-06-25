# ╔══════════════════════════════════════════════════════════════╗
# ║  Zubaco — Production Environment                           ║
# ║  Scaled for 100k concurrent users                          ║
# ╚══════════════════════════════════════════════════════════════╝

environment = "production"
aws_region  = "ap-south-1"
domain_name = "zubaco.com"

# ─── Database (high-perf, multi-AZ, read replica) ────────────
db_instance_class    = "db.r6g.xlarge"
db_multi_az          = true
db_read_replica      = true
db_backup_retention  = 14
db_max_storage       = 500

# ─── Redis (clustered, failover) ─────────────────────────────
redis_node_type      = "cache.r6g.large"
redis_num_clusters   = 2
redis_failover       = true

# ─── ECS (scaled for 100k concurrent) ────────────────────────
# 20 tasks × ~5k users/task = 100k concurrent capacity
ecs_desired_count    = 5
ecs_min_capacity     = 5
ecs_max_capacity     = 20
ecs_cpu              = 1024    # 1 vCPU per task
ecs_memory           = 2048    # 2 GB per task

# ─── Scaling ──────────────────────────────────────────────────
enable_pgbouncer     = true
enable_read_replica  = true
enable_vpc_endpoints = true
enable_waf           = true
enable_dashboard     = true

# ─── Retention ────────────────────────────────────────────────
log_retention_days   = 30
alert_email          = "devops@zubaco.com"
