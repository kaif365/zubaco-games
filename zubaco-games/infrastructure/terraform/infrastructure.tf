# ═══════════════════════════════════════════════════════════════
# VPC & NETWORKING
# ═══════════════════════════════════════════════════════════════

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "zubaco-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = var.environment
  }
}

# ═══════════════════════════════════════════════════════════════
# ECR REPOSITORIES
# ═══════════════════════════════════════════════════════════════

resource "aws_ecr_repository" "platform" {
  name                 = "zubaco-platform"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "admin_backend" {
  name                 = "zubaco-admin-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

locals {
  game_names = [
    "arrows", "block-fill", "colour-sorting", "flash-spot",
    "infinity-loop", "live-route-builder", "logic-reflector",
    "maze-navigation", "memory-card-matching", "memory-groups",
    "number-grid-sprint", "object-placement-memory", "pattern-survival",
    "rapid-category-sort", "reflex-endurance", "sequence-recall",
    "sliding-puzzle", "speed-type-answer", "true-false-blitz",
    "word-unscramble"
  ]
}

resource "aws_ecr_repository" "game_backends" {
  for_each             = toset(local.game_names)
  name                 = "zubaco-${each.key}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ═══════════════════════════════════════════════════════════════
# RDS POSTGRESQL
# ═══════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name       = "zubaco-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "rds" {
  name_prefix = "zubaco-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier = "zubaco-${var.environment}"

  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  allocated_storage     = 50
  max_allocated_storage = 200
  storage_encrypted     = true

  db_name  = "zubaco_platform"
  username = "zubaco_admin"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  multi_az                = var.environment == "production"
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"

  performance_insights_enabled = true
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

# ═══════════════════════════════════════════════════════════════
# ELASTICACHE REDIS
# ═══════════════════════════════════════════════════════════════

resource "aws_security_group" "redis" {
  name_prefix = "zubaco-redis-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "zubaco-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "zubaco-${var.environment}"
  description          = "Zubaco Redis cluster"

  node_type            = var.redis_node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  port                 = 6379
  engine_version       = "7.1"

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = var.environment == "production"
}

# ═══════════════════════════════════════════════════════════════
# ECS CLUSTER
# ═══════════════════════════════════════════════════════════════

resource "aws_ecs_cluster" "main" {
  name = "zubaco-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "zubaco-ecs-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ═══════════════════════════════════════════════════════════════
# ALB (Application Load Balancer)
# ═══════════════════════════════════════════════════════════════

resource "aws_security_group" "alb" {
  name_prefix = "zubaco-alb-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "main" {
  name               = "zubaco-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = var.environment == "production"
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.platform.arn
  }
}

resource "aws_lb_target_group" "platform" {
  name        = "zubaco-platform-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

# ═══════════════════════════════════════════════════════════════
# S3 + CLOUDFRONT (Game Frontends CDN)
# ═══════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "games_cdn" {
  bucket = "zubaco-games-cdn-${var.environment}"
}

resource "aws_s3_bucket" "admin_cdn" {
  bucket = "zubaco-admin-cdn-${var.environment}"
}

resource "aws_s3_bucket" "assets" {
  bucket = "zubaco-assets-${var.environment}"
}

resource "aws_cloudfront_distribution" "games" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = ["game.${var.domain_name}"]

  origin {
    domain_name = aws_s3_bucket.games_cdn.bucket_regional_domain_name
    origin_id   = "S3-games"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.games.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-games"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_cloudfront_origin_access_identity" "games" {
  comment = "Zubaco Games CDN"
}

# ═══════════════════════════════════════════════════════════════
# ACM (SSL Certificate)
# ═══════════════════════════════════════════════════════════════

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# ═══════════════════════════════════════════════════════════════
# SECRETS MANAGER
# ═══════════════════════════════════════════════════════════════

resource "aws_secretsmanager_secret" "db_credentials" {
  name = "zubaco/${var.environment}/db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db_password.result
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = aws_db_instance.main.db_name
  })
}

resource "aws_secretsmanager_secret" "jwt_secrets" {
  name = "zubaco/${var.environment}/jwt-secrets"
}

# ═══════════════════════════════════════════════════════════════
# SQS QUEUES
# ═══════════════════════════════════════════════════════════════

resource "aws_sqs_queue" "game_events" {
  name                       = "zubaco-${var.environment}-game-events"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.game_events_dlq.arn
    maxReceiveCount     = 5
  })

  tags = { Environment = var.environment }
}

resource "aws_sqs_queue" "game_events_dlq" {
  name                      = "zubaco-${var.environment}-game-events-dlq"
  message_retention_seconds = 1209600
  tags                      = { Environment = var.environment }
}

resource "aws_sqs_queue" "notifications" {
  name                       = "zubaco-${var.environment}-notifications"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Environment = var.environment }
}

resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "zubaco-${var.environment}-notifications-dlq"
  message_retention_seconds = 1209600
  tags                      = { Environment = var.environment }
}

resource "aws_sqs_queue" "analytics" {
  name                       = "zubaco-${var.environment}-analytics"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 604800
  receive_wait_time_seconds  = 20
  tags                       = { Environment = var.environment }
}

# ═══════════════════════════════════════════════════════════════
# SNS TOPICS
# ═══════════════════════════════════════════════════════════════

resource "aws_sns_topic" "push_notifications" {
  name = "zubaco-${var.environment}-push-notifications"
  tags = { Environment = var.environment }
}

resource "aws_sns_topic" "game_events" {
  name = "zubaco-${var.environment}-game-events"
  tags = { Environment = var.environment }
}

resource "aws_sns_topic" "alerts" {
  name = "zubaco-${var.environment}-alerts"
  tags = { Environment = var.environment }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Fan-out: game events SNS -> SQS
resource "aws_sns_topic_subscription" "game_events_to_sqs" {
  topic_arn = aws_sns_topic.game_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.game_events.arn
}

resource "aws_sqs_queue_policy" "game_events_sns" {
  queue_url = aws_sqs_queue.game_events.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.game_events.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.game_events.arn } }
    }]
  })
}

# ═══════════════════════════════════════════════════════════════
# ROUTE 53 DNS
# ═══════════════════════════════════════════════════════════════

resource "aws_route53_zone" "main" {
  name = var.domain_name
  tags = { Environment = var.environment }
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "admin" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "admin.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "games_cdn" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "games.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.games.domain_name]
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

# ═══════════════════════════════════════════════════════════════
# ECS TASK DEFINITIONS & SERVICES
# ═══════════════════════════════════════════════════════════════

resource "aws_ecs_task_definition" "platform" {
  family                   = "zubaco-platform-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.environment == "production" ? "1024" : "512"
  memory                   = var.environment == "production" ? "2048" : "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "platform"
    image = "${aws_ecr_repository.platform.repository_url}:latest"
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "3000" },
      { name = "DATABASE_POOL_SIZE", value = "5" },
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:host::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/zubaco-platform-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/v1/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "platform" {
  name            = "zubaco-platform"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.platform.arn
  desired_count   = var.environment == "production" ? 3 : 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.platform.arn
    container_name   = "platform"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_ecs_task_definition" "admin_backend" {
  family                   = "zubaco-admin-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "admin-backend"
    image = "${aws_ecr_repository.admin_backend.repository_url}:latest"
    portMappings = [{ containerPort = 3001, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = "3001" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/zubaco-admin-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "admin_backend" {
  name            = "zubaco-admin"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin_backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.admin.arn
    container_name   = "admin-backend"
    container_port   = 3001
  }
}

# ═══════════════════════════════════════════════════════════════
# AUTO-SCALING POLICIES
# ═══════════════════════════════════════════════════════════════

resource "aws_appautoscaling_target" "platform" {
  max_capacity       = var.environment == "production" ? 10 : 3
  min_capacity       = var.environment == "production" ? 3 : 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.platform.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "platform_cpu" {
  name               = "platform-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.platform.resource_id
  scalable_dimension = aws_appautoscaling_target.platform.scalable_dimension
  service_namespace  = aws_appautoscaling_target.platform.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "platform_memory" {
  name               = "platform-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.platform.resource_id
  scalable_dimension = aws_appautoscaling_target.platform.scalable_dimension
  service_namespace  = aws_appautoscaling_target.platform.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ═══════════════════════════════════════════════════════════════
# CLOUDWATCH ALARMS
# ═══════════════════════════════════════════════════════════════

resource "aws_cloudwatch_log_group" "platform" {
  name              = "/ecs/zubaco-platform-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 7
}

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/ecs/zubaco-admin-${var.environment}"
  retention_in_days = var.environment == "production" ? 30 : 7
}

resource "aws_cloudwatch_metric_alarm" "platform_cpu_high" {
  alarm_name          = "zubaco-${var.environment}-platform-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Platform CPU > 85% for 3 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.platform.name
  }
}

resource "aws_cloudwatch_metric_alarm" "platform_memory_high" {
  alarm_name          = "zubaco-${var.environment}-platform-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Platform Memory > 90% for 3 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.platform.name
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "zubaco-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU > 80% for 3 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "zubaco-${var.environment}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "ALB 5xx errors > 50/min for 2 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "zubaco-${var.environment}-alb-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 2.0
  alarm_description   = "ALB avg latency > 2s for 3 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ═══════════════════════════════════════════════════════════════
# WAF (Web Application Firewall)
# ═══════════════════════════════════════════════════════════════

resource "aws_wafv2_web_acl" "main" {
  name        = "zubaco-${var.environment}"
  scope       = "REGIONAL"
  description = "Zubaco WAF Rules"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "zubaco-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-managed-common"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "zubaco-common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-managed-sql-injection"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "zubaco-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "zubaco-waf"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
