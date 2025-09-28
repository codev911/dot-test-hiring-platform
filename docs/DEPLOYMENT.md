# Deployment Guide - Hiring Platform

Dokumentasi lengkap untuk deployment aplikasi hiring platform dengan berbagai skenario: full Docker stack, development dengan services terpisah, dan deployment dengan binary lokal. Mendukung Docker dan Podman sebagai alternatif container runtime.

## Daftar Isi

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Full Docker Stack](#full-docker-stack)
- [Development Setup](#development-setup)
- [Local Binary Setup](#local-binary-setup)
- [Podman Alternative](#podman-alternative)
- [Production Deployment](#production-deployment)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js 24** (sesuai dengan .nvmrc dan Dockerfile)
- **Docker 20+** atau **Podman 3+**
- **Docker Compose** atau **Podman Compose**
- **2GB RAM minimum** (4GB recommended untuk full stack)
- **5GB disk space** untuk volumes dan images

### Tools Installation

**Docker:**

```bash
# macOS
brew install docker

# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker $USER

# Arch Linux
sudo pacman -S docker docker-compose
sudo systemctl enable docker
```

**Podman (Recommended Alternative):**

```bash
# macOS
brew install podman

# Ubuntu/Debian
sudo apt install podman

# Arch Linux
sudo pacman -S podman

# Fedora/RHEL
sudo dnf install podman
```

**Node.js & Package Manager:**

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
nvm use 24

# Verify installation
node --version  # Should be v24.x.x
npm --version   # Should be 10.x.x

# Install Yarn (optional but recommended)
npm install -g yarn
```

## Environment Configuration

### 1. Environment File Setup

```bash
# Copy example environment file
cp .env.example .env
```

### 2. Environment Variables

```bash
# Application Settings
NODE_ENV='development'  # development, test, production
PORT=3000

# Database Configuration
MYSQL_HOST='localhost'
MYSQL_PORT=3306
MYSQL_USER='root'
MYSQL_PASSWORD='password'
MYSQL_DATABASE='hireplatform'
MYSQL_LOGGING=true

# JWT Configuration
JWT_SECRET='your-super-secret-jwt-key-change-in-production'
JWT_EXPIRES_IN='24h'

# MinIO S3 Configuration
MINIO_ENDPOINT='http://localhost:9000'
MINIO_ACCESS_KEY='minioadmin'
MINIO_SECRET_KEY='minioadmin123'
MINIO_BUCKET='hireplatform'

# Redis Configuration
REDIS_HOST='localhost'
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
REDIS_DB=0
CACHE_TTL_MS=60000
```

### 3. Production Environment

Untuk production, pastikan menggunakan nilai yang aman:

```bash
# Generate secure JWT secret
openssl rand -base64 64

# Use strong database passwords
openssl rand -base64 32

# Use environment-specific endpoints
MYSQL_HOST='your-mysql-host'
MINIO_ENDPOINT='https://your-s3-endpoint'
```

## Full Docker Stack

### 1. Using Existing docker-compose.yml

**Untuk development/testing lengkap:**

```bash
# Start semua services (MySQL, Redis, MinIO, Application)
podman compose up -d

# Alternatif jika masih menggunakan Docker
docker compose up -d

# View logs
podman compose logs -f

# Check services status
podman compose ps

# Stop all services
podman compose down

# Clean up with volumes (DANGER: deletes all data)
podman compose down -v
```

### 2. Enhanced docker-compose.yml

Tambahkan konfigurasi berikut ke `docker-compose.yml` untuk production:

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: hiring_mysql
    restart: unless-stopped
    ports:
      - '3306:3306'
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-password}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-hireplatform}
      MYSQL_USER: ${MYSQL_USER:-developer}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-developer}
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test:
        [
          'CMD',
          'mysqladmin',
          'ping',
          '-h',
          '127.0.0.1',
          '-uroot',
          '-p${MYSQL_ROOT_PASSWORD:-password}',
        ]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: hiring_redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    command: ['redis-server', '--appendonly', 'yes', '--maxmemory', '256mb']
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: hiring_minio
    restart: unless-stopped
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin123}
      MINIO_CONSOLE_ADDRESS: ':9001'
    command: ['server', '/data', '--address', ':9000', '--console-address', ':9001']
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 30s
      timeout: 20s
      retries: 3

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hiring_app
    restart: unless-stopped
    ports:
      - '${PORT:-3000}:3000'
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 3000
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
      MYSQL_USER: ${MYSQL_USER:-developer}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-developer}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-hireplatform}
      MYSQL_LOGGING: 'false'
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-24h}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY:-minioadmin123}
      MINIO_BUCKET: ${MINIO_BUCKET:-hireplatform}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_DB: 0
      CACHE_TTL_MS: 60000
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/']
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  mysql_data:
  redis_data:
  minio_data:
```

### 3. Service Access Points

Setelah stack berjalan:

- **Application**: http://localhost:3000
- **Swagger API**: http://localhost:3000/swagger
- **MySQL**: localhost:3306
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **MinIO API**: http://localhost:9000

## Development Setup

### 1. Services Only (Recommended untuk Development)

**Step 1: Buat docker-compose.dev.yml**

```yaml
# docker-compose.dev.yml - Services only
services:
  mysql:
    image: mysql:8.0
    container_name: hiring_mysql_dev
    restart: unless-stopped
    ports:
      - '3306:3306'
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: hireplatform
      MYSQL_USER: developer
      MYSQL_PASSWORD: developer
    volumes:
      - mysql_dev_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7-alpine
    container_name: hiring_redis_dev
    restart: unless-stopped
    ports:
      - '6379:6379'
    command: ['redis-server', '--appendonly', 'yes']
    volumes:
      - redis_dev_data:/data

  minio:
    image: minio/minio:latest
    container_name: hiring_minio_dev
    restart: unless-stopped
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
      MINIO_CONSOLE_ADDRESS: ':9001'
    command: ['server', '/data', '--address', ':9000', '--console-address', ':9001']
    volumes:
      - minio_dev_data:/data

volumes:
  mysql_dev_data:
  redis_dev_data:
  minio_dev_data:
```

**Step 2: Start Services**

```bash
# Start only external services
podman compose -f docker-compose.dev.yml up -d

# Verify services are running
podman compose -f docker-compose.dev.yml ps
```

**Step 3: Install Dependencies**

```bash
# Using yarn (recommended)
yarn install

# Or using npm
npm install
```

**Step 4: Database Setup**

```bash
# Wait for MySQL to be ready (about 30 seconds)
sleep 30

# Run migrations
yarn migration:run

# Seed initial data
yarn seed:owner

# Verify database
mysql -h localhost -u developer -pdeveloper hireplatform -e "SHOW TABLES;"
```

**Step 5: Start Development Server**

```bash
# Start with hot reload
yarn start:dev

# Or with debug mode
yarn start:debug
```

### 2. Manual Development Setup

**Install dependencies dan start local server:**

```bash
# Install dependencies
yarn install

# Set environment variables untuk localhost
export MYSQL_HOST=localhost
export REDIS_HOST=localhost
export MINIO_ENDPOINT=http://localhost:9000

# Run migrations
yarn migration:run

# Start development server
yarn start:dev
```

**Dengan npm:**

```bash
npm install
npm run migration:run
npm run start:dev
```

## Local Binary Setup

### 1. MySQL Installation & Setup

**macOS:**

```bash
# Install MySQL
brew install mysql

# Start MySQL service
brew services start mysql

# Secure installation
mysql_secure_installation

# Create database
mysql -u root -p
CREATE DATABASE hireplatform;
CREATE USER 'developer'@'localhost' IDENTIFIED BY 'developer';
GRANT ALL PRIVILEGES ON hireplatform.* TO 'developer'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Ubuntu/Debian:**

```bash
# Install MySQL
sudo apt update
sudo apt install mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation

# Create database
sudo mysql
CREATE DATABASE hireplatform;
CREATE USER 'developer'@'localhost' IDENTIFIED BY 'developer';
GRANT ALL PRIVILEGES ON hireplatform.* TO 'developer'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Arch Linux:**

```bash
# Install MySQL
sudo pacman -S mysql

# Initialize MySQL
sudo mysqld --initialize --user=mysql --basedir=/usr --datadir=/var/lib/mysql

# Start MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Setup database (same as Ubuntu)
```

### 2. Redis Installation & Setup

**macOS:**

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test connection
redis-cli ping
```

**Ubuntu/Debian:**

```bash
# Install Redis
sudo apt install redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
```

**Arch Linux:**

```bash
# Install Redis
sudo pacman -S redis

# Start and enable Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test connection
redis-cli ping
```

### 3. MinIO Installation & Setup

**Using Binary:**

```bash
# Download MinIO (Linux/macOS)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create data directory
mkdir -p ~/minio-data

# Start MinIO server
minio server ~/minio-data --console-address ":9001"

# Access MinIO Console: http://localhost:9001
# Default credentials: minioadmin / minioadmin
```

**Using Docker (jika tidak ingin full stack):**

```bash
# Run only MinIO
docker run -d \
  --name minio-standalone \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin123" \
  -v minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

### 4. Application Setup

```bash
# Update .env untuk localhost connections
MYSQL_HOST=localhost
REDIS_HOST=localhost
MINIO_ENDPOINT=http://localhost:9000

# Install dependencies
yarn install

# Run migrations
yarn migration:run

# Seed initial data
yarn seed:owner

# Start development server
yarn start:dev
```

## Podman Alternative

### 1. Basic Podman Commands

**Modern Podman (v4.0+) dengan Compose support:**

```bash
# Podman sudah include compose subcommand
podman compose up -d

# Untuk development services only
podman compose -f docker-compose.dev.yml up -d

# Monitor services
podman compose ps
podman compose logs -f
```

### 2. Podman-specific Configuration

**Setup rootless Podman:**

```bash
# Configure subuid/subgid
echo "$USER:100000:65536" | sudo tee -a /etc/subuid
echo "$USER:100000:65536" | sudo tee -a /etc/subgid

# Initialize Podman
podman system reset
```

**Port mapping considerations:**

```bash
# Podman might need explicit network setup
podman network create hiring-network

# Update docker-compose.yml to use custom network
networks:
  default:
    external:
      name: hiring-network
```

### 3. Running with Podman

```bash
# Start services only
podman compose -f docker-compose.dev.yml up -d

# Full stack
podman compose up -d

# Monitor logs
podman compose logs -f

# Clean up
podman compose down

# Check container status
podman ps
podman stats --all
```

## Production Deployment

### 1. Environment Hardening

**Create production .env:**

```bash
# Application
NODE_ENV=production
PORT=3000

# Database - Use strong passwords
MYSQL_HOST=production-mysql-host
MYSQL_USER=app_user
MYSQL_PASSWORD=$(openssl rand -base64 32)
MYSQL_DATABASE=hireplatform

# JWT - Use strong secret
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=24h

# MinIO - Use production S3 or dedicated MinIO
MINIO_ENDPOINT=https://s3.your-domain.com
MINIO_ACCESS_KEY=production-access-key
MINIO_SECRET_KEY=$(openssl rand -base64 32)

# Redis - Use Redis cluster or managed service
REDIS_HOST=production-redis-host
REDIS_PASSWORD=$(openssl rand -base64 32)
```

### 2. Docker Production Setup

**Optimized Dockerfile for production:**

```dockerfile
# Multi-stage build for smaller production image
FROM node:24-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Build stage
FROM deps AS build
COPY . .
RUN yarn build

# Production stage
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy only production files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "dist/main.js"]
```

### 3. nginx Reverse Proxy

**nginx.conf for production:**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            proxy_pass http://app/;
        }
    }
}
```

### 4. Docker Swarm Deployment

**docker-stack.yml for Docker Swarm:**

```yaml
version: '3.8'

services:
  app:
    image: hiring-platform:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
    secrets:
      - jwt_secret
      - db_password
    networks:
      - hiring-network

  nginx:
    image: nginx:alpine
    deploy:
      replicas: 2
    ports:
      - '80:80'
      - '443:443'
    configs:
      - source: nginx_config
        target: /etc/nginx/nginx.conf
    networks:
      - hiring-network

secrets:
  jwt_secret:
    external: true
  db_password:
    external: true

configs:
  nginx_config:
    external: true

networks:
  hiring-network:
    driver: overlay
```

## Monitoring & Health Checks

### 1. Application Health Endpoint

**Built-in health check:**

```bash
# Check application health (root endpoint sebagai health check)
curl http://localhost:3000/

# Expected response:
"Hello World!"

# Alternative: Check Swagger API documentation
curl http://localhost:3000/swagger
```

### 2. Container Health Monitoring

**Check service status:**

```bash
# Podman health status (recommended)
podman compose ps

# Individual service logs
podman compose logs mysql
podman compose logs redis
podman compose logs minio
podman compose logs app

# Real-time monitoring
podman stats --all
```

**Docker monitoring (alternative):**

```bash
# Docker service status
docker compose ps

# Container resource usage
docker stats
```

### 3. Database Health Check

```bash
# MySQL connection test
mysql -h localhost -u developer -pdeveloper hireplatform -e "SELECT 1;"

# Redis connection test
redis-cli ping

# MinIO health check
curl -f http://localhost:9000/minio/health/live
```

### 4. Automated Health Monitoring

**Using compose healthchecks:**

```bash
# View health status with Podman (recommended)
podman compose ps

# View health status with Docker (alternative)
docker compose ps

# Format: SERVICE   IMAGE     COMMAND   CREATED   STATUS
# mysql     mysql:8.0  ...      Up       healthy
# redis     redis:7    ...      Up       healthy
# minio     minio      ...      Up       healthy
# app       app        ...      Up       healthy
```

**External monitoring script:**

```bash
#!/bin/bash
# health-monitor.sh

services=("mysql:3306" "redis:6379" "minio:9000" "app:3000")

for service in "${services[@]}"; do
    host=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)

    if nc -z localhost $port; then
        echo "✅ $host:$port is healthy"
    else
        echo "❌ $host:$port is unhealthy"
    fi
done
```

## Troubleshooting

### 1. Common Issues

**Port already in use:**

```bash
# Check what's using the port
lsof -i :3306  # MySQL
lsof -i :6379  # Redis
lsof -i :9000  # MinIO

# Kill process if needed
sudo kill -9 $(lsof -t -i:3306)
```

**Docker/Podman permission issues:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# For Podman (rootless)
podman system migrate
```

**Database connection issues:**

```bash
# Check MySQL is accepting connections
mysql -h localhost -u root -p -e "SELECT 1;"

# Reset MySQL password with Podman (recommended)
podman compose exec mysql mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;

# Reset MySQL password with Docker (alternative)
docker compose exec mysql mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

**Migration issues:**

```bash
# Reset database (DANGER: deletes all data)
# With Podman (recommended)
podman compose down -v
podman compose up -d mysql redis minio
sleep 30
yarn migration:run

# With Docker (alternative)
docker compose down -v
docker compose up -d mysql redis minio
sleep 30
yarn migration:run

# Manual migration run
# With Podman
podman compose exec app yarn migration:run

# With Docker
docker compose exec app yarn migration:run
```

### 2. Performance Issues

**Memory usage:**

```bash
# Check container memory usage
docker stats

# Limit container memory
# Add to docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 512M
```

**Disk space:**

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# For Podman
podman system df
podman system prune -a
```

### 3. Log Analysis

**Centralized logging:**

```bash
# View all logs
# With Podman (recommended)
podman compose logs -f

# With Docker (alternative)
docker compose logs -f

# Filter by service
# With Podman
podman compose logs -f app
podman compose logs -f mysql --tail=100

# With Docker
docker compose logs -f app
docker compose logs -f mysql --tail=100

# Search logs
podman compose logs app | grep ERROR
# or
docker compose logs app | grep ERROR
```

**Application debugging:**

```bash
# Enable debug mode
export NODE_ENV=development
yarn start:debug

# Database query logging
export MYSQL_LOGGING=true
```

### 4. Network Issues

**Container networking:**

```bash
# Inspect network
# With Podman (recommended)
podman network ls
podman network inspect hiring-platform_default

# With Docker (alternative)
docker network ls
docker network inspect hiring-platform_default

# Test connectivity between containers
# With Podman
podman compose exec app ping mysql
podman compose exec app ping redis

# With Docker
docker compose exec app ping mysql
docker compose exec app ping redis
```

**DNS resolution:**

```bash
# Check if containers can resolve each other
# With Podman (recommended)
podman compose exec app nslookup mysql
podman compose exec app nslookup redis

# With Docker (alternative)
docker compose exec app nslookup mysql
docker compose exec app nslookup redis
```

### 5. Quick Recovery Commands

**Complete restart:**

```bash
# Full restart with fresh data
# With Podman (recommended)
podman compose down -v
podman compose up -d
sleep 30
yarn migration:run
yarn seed:owner

# With Docker (alternative)
docker compose down -v
docker compose up -d
sleep 30
yarn migration:run
yarn seed:owner
```

**Service-specific restart:**

```bash
# Restart only app
# With Podman (recommended)
podman compose restart app

# With Docker (alternative)
docker compose restart app

# Restart and rebuild app
# With Podman
podman compose up -d --build app

# With Docker
docker compose up -d --build app
```

**Emergency cleanup:**

```bash
# Stop everything and clean up
# With Podman (recommended)
podman compose down -v
podman system prune -a
podman volume prune
podman network prune

# With Docker (alternative)
docker compose down -v
docker system prune -a
docker volume prune
docker network prune
```
