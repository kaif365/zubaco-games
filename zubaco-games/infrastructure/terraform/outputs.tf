output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns" {
  value = aws_lb.main.dns_name
}

output "rds_endpoint" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "ecr_platform_url" {
  value = aws_ecr_repository.platform.repository_url
}

output "games_cdn_domain" {
  value = aws_cloudfront_distribution.games.domain_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}
