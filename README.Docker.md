# Docker Deployment Guide - RFP Analysis Platform

This guide provides instructions for deploying the RFP Analysis Platform using Docker containers.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB free disk space

## Quick Start

### 1. Environment Setup

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file with your actual values:
- `DB_PASSWORD`: Strong password for PostgreSQL
- `JWT_SECRET`: Secure secret key for JWT tokens
- `OPENROUTER_API_KEY`: Your OpenRouter API key

### 2. Development Deployment

For local development:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Production Deployment

For production environment:

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Service URLs

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432 (internal access only)

## Container Architecture

### Frontend Container
- **Base Image**: nginx:alpine
- **Port**: 80
- **Purpose**: Serves React application with optimized nginx configuration
- **Features**: Gzip compression, security headers, React Router support

### Backend Container
- **Base Image**: node:18-alpine
- **Port**: 3001
- **Purpose**: Express.js API server
- **Features**: Health checks, non-root user, file upload handling

### Database Container
- **Base Image**: postgres:15-alpine
- **Port**: 5432
- **Purpose**: PostgreSQL database
- **Features**: Persistent data storage, health checks, initialization scripts

## Volume Management

### Persistent Volumes
- `postgres_data`: Database files
- `backend_uploads`: User uploaded documents

### Backup Volumes
```bash
# Backup database
docker-compose exec database pg_dump -U rfp_user rfp_analysis > backup.sql

# Backup uploads
docker cp rfp-analysis-api:/app/uploads ./uploads-backup
```

## Environment Variables

### Required Variables
```bash
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
OPENROUTER_API_KEY=your_api_key
```

### Optional Variables
```bash
# Database (defaults provided)
DB_HOST=database
DB_PORT=5432
DB_NAME=rfp_analysis
DB_USER=rfp_user

# Frontend
VITE_API_URL=http://localhost:3001/api
ALLOWED_ORIGINS=http://localhost:80
```

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker-compose logs backend | grep health
```

## Scaling

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale with load balancer (production)
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

### Resource Limits
Production compose includes resource limits:
- Backend: 1 CPU, 1GB RAM
- Frontend: 0.5 CPU, 256MB RAM

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database status
docker-compose logs database

# Restart database
docker-compose restart database
```

#### File Upload Issues
```bash
# Check upload directory permissions
docker-compose exec backend ls -la uploads/

# Check disk space
docker system df
```

#### Frontend Not Loading
```bash
# Check nginx logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Debug Commands

```bash
# Enter container shell
docker-compose exec backend sh
docker-compose exec frontend sh

# View container resources
docker stats

# Clean up unused resources
docker system prune -a
```

## Security Considerations

### Production Security
1. **Environment Variables**: Use Docker secrets or external secret management
2. **Network Security**: Use custom networks, avoid exposing internal ports
3. **SSL/TLS**: Configure HTTPS with proper certificates
4. **User Permissions**: Containers run as non-root users
5. **Image Security**: Regular base image updates

### SSL Configuration
For production HTTPS:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Add your SSL certificates
cp your-cert.pem nginx/ssl/
cp your-key.pem nginx/ssl/
```

## Monitoring

### Container Monitoring
```bash
# Resource usage
docker stats

# Container health
docker-compose ps

# Service logs
docker-compose logs -f --tail=100
```

### Application Monitoring
- Health endpoints: `/health` (backend), `/health` (frontend)
- Database monitoring via PostgreSQL logs
- File system monitoring for uploads directory

## Backup Strategy

### Automated Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose exec -T database pg_dump -U rfp_user rfp_analysis > "backup_db_${DATE}.sql"

# Uploads backup
docker cp rfp-analysis-api:/app/uploads "backup_uploads_${DATE}"

# Compress backups
tar -czf "rfp_backup_${DATE}.tar.gz" backup_db_${DATE}.sql backup_uploads_${DATE}
```

### Restore Process
```bash
# Restore database
docker-compose exec -T database psql -U rfp_user rfp_analysis < backup_db.sql

# Restore uploads
docker cp backup_uploads/ rfp-analysis-api:/app/uploads
```

## Performance Optimization

### Production Optimizations
1. **Multi-stage builds**: Smaller image sizes
2. **Nginx caching**: Static asset caching
3. **Database tuning**: PostgreSQL configuration
4. **Resource limits**: Prevent resource exhaustion

### Monitoring Performance
```bash
# Container resource usage
docker stats --no-stream

# Database performance
docker-compose exec database psql -U rfp_user -d rfp_analysis -c "SELECT * FROM pg_stat_activity;"
```

## Updates and Maintenance

### Updating Services
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Clean old images
docker image prune -a
```

### Database Migrations
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed data (if needed)
docker-compose exec backend npm run seed
```

## Support

For issues with Docker deployment:
1. Check service logs: `docker-compose logs [service]`
2. Verify environment variables
3. Ensure sufficient system resources
4. Check network connectivity between containers

For application-specific issues, refer to the main application documentation.