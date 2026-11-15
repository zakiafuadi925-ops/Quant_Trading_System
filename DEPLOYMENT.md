# 🚀 Production Deployment & Infrastructure Guide

> **System Name**: Bitcoin Research & Quantitative Trading Lab  
> **Target Release**: v5.2.1 PRO  
> **Default Port**: `3002` (configurable via `PORT` environment variable)  
> **Workspace**: `/mnt/data/BACK_UP/Code/Quant_Trading_System`

---

## 📑 Table of Contents
1. [System Requirements & Architecture](#1-system-requirements--architecture)
2. [Environment Configuration (`.env`)](#2-environment-configuration-env)
3. [Production Build & Verification Pipeline](#3-production-build--verification-pipeline)
4. [Deployment Option A: Bare-Metal / VPS with Systemd](#4-deployment-option-a-bare-metal--vps-with-systemd)
5. [Deployment Option B: Process Manager (PM2)](#5-deployment-option-b-process-manager-pm2)
6. [Deployment Option C: Docker & Docker Compose](#6-deployment-option-c-docker--docker-compose)
7. [Nginx Reverse Proxy & SSL Configuration](#7-nginx-reverse-proxy--ssl-configuration)
8. [Health Checks, Monitoring & Maintenance](#8-health-checks-monitoring--maintenance)

---

## 1. System Requirements & Architecture

The system operates as a unified Node.js/TypeScript service:
- **Production Mode (`NODE_ENV=production`)**: Express serves pre-compiled static assets from `dist/` and handles API requests (`/api/crypto/*`, `/api/health`).
- **Development Mode (`NODE_ENV=development`)**: Vite middleware mounts directly into Express with Hot Module Replacement (HMR).

### Recommended Hardware Specs
| Component | Minimum | Recommended |
|---|---|---|
| **CPU** | 1 vCPU (2.0 GHz+) | 2 vCPU+ (for parallel Web Worker simulations) |
| **RAM** | 1 GB | 2 GB – 4 GB |
| **Disk** | 2 GB SSD | 10 GB SSD (accommodates historical CSV archives & ML weights) |
| **OS** | Linux (Ubuntu 22.04 LTS / Debian 12 / Alpine) | Ubuntu 24.04 LTS |
| **Node.js** | `>= 20.10.0 LTS` | `22.x LTS` |
| **NPM** | `>= 10.x` | Latest |

---

## 2. Environment Configuration (`.env`)

Create your production environment file from `.env.example`:

```bash
cp .env.example .env
chmod 600 .env
```

### Production Configuration Parameters:

```ini
# ==============================================================================
# SERVER & ENVIRONMENT
# ==============================================================================
NODE_ENV=production
PORT=3002

# ==============================================================================
# CRYPTO DATA PROVIDERS & FEEDS
# ==============================================================================
# Base URL for market data feeds (Binance / CoinGecko fallback)
CRYPTO_API_BASE_URL=https://api.binance.com

# Optional API key for authenticated or higher rate-limit endpoints
CRYPTO_API_KEY=

# ==============================================================================
# SYSTEM & PROXY FLAGS
# ==============================================================================
# Set to true in headless CI or production environments without dev HMR
DISABLE_HMR=true

# Enable verbose proxy debugging logs in terminal (default: false for silent operation)
DEBUG_PROXY=false
```

---

## 3. Production Build & Verification Pipeline

Always compile and verify frontend assets before spawning the production server process:

```bash
# 1. Pull latest code and large neural network binary files (Git LFS)
git pull origin main
git lfs pull

# 2. Install production and build dependencies
npm ci

# 3. Compile TypeScript frontend into dist/
npm run build

# 4. Run automated test suite to ensure quantitative integrity
npm test

# 5. Test boot the server locally
NODE_ENV=production npm run start
```

Verify that the health check responds with HTTP 200:
```bash
curl -I http://localhost:3002/api/health
# Expected: HTTP/1.1 200 OK
```

---

## 4. Deployment Option A: Bare-Metal / VPS with Systemd

For standard Linux VPS (Ubuntu/Debian), running the server as a `systemd` daemon ensures auto-restart on crashes and system reboots.

### Step 1: Create System User
```bash
sudo useradd -r -s /bin/false quantlab
sudo chown -R quantlab:quantlab /opt/Quant_Trading_System
```

### Step 2: Create Systemd Service File
Create `/etc/systemd/system/quant-trading.service`:

```ini
[Unit]
Description=Bitcoin Research & Quantitative Trading Lab
After=network.target

[Service]
Type=simple
User=quantlab
WorkingDirectory=/opt/Quant_Trading_System
Environment=NODE_ENV=production
Environment=PORT=3002
EnvironmentFile=/opt/Quant_Trading_System/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
KillMode=process
LimitNOFILE=65536

# Security hardening
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

### Step 3: Enable & Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable quant-trading
sudo systemctl start quant-trading
sudo systemctl status quant-trading
```

View live logs:
```bash
journalctl -u quant-trading -f
```

---

## 5. Deployment Option B: Process Manager (PM2)

If managing multiple Node services or requiring cluster clustering, use **PM2**:

### Step 1: Install PM2 Globally
```bash
npm install -g pm2
```

### Step 2: Create `ecosystem.config.cjs`
Create `ecosystem.config.cjs` in the repository root:

```javascript
module.exports = {
  apps: [
    {
      name: 'quant-trading-lab',
      script: 'server.ts',
      interpreter: 'tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DISABLE_HMR: 'true'
      }
    }
  ]
};
```

### Step 3: Start and Save PM2 Process
```bash
# Build frontend first
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 state to auto-boot on server restart
pm2 save
pm2 startup
```

---

## 6. Deployment Option C: Docker & Docker Compose

Containerized deployment isolates the runtime environment, dependencies, and historical CSV datasets into an immutable Docker image.

### 6.1. Multi-Stage `Dockerfile`
Create `Dockerfile` in the project root:

```dockerfile
# ==============================================================================
# Stage 1: Build Frontend Assets
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Compile production bundle into /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Production Runner
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV DISABLE_HMR=true

# Create non-root system user for security
RUN addgroup -S quantgroup && adduser -S quantuser -G quantgroup

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server, datasets, models, and configs
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/trading_data ./trading_data
COPY --from=builder /app/data ./data
COPY --from=builder /app/models ./models
COPY --from=builder /app/.env.example ./.env

# Set ownership to non-root user
RUN chown -R quantuser:quantgroup /app

USER quantuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
```

---

### 6.2. `docker-compose.yml`
Create `docker-compose.yml` for unified local or production orchestration:

```yaml
version: '3.8'

services:
  quant-lab:
    build:
      context: .
      dockerfile: Dockerfile
    image: quant-trading-system:v5.2.1
    container_name: quant_trading_lab
    restart: unless-stopped
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - DISABLE_HMR=true
      - DEBUG_PROXY=false
    volumes:
      # Optional: Mount external CSV dataset folder to update without rebuilding
      - ./trading_data:/app/trading_data:ro
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2048M
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Running with Docker Compose:
```bash
# Build and run in detached mode
docker compose up -d --build

# Inspect logs
docker compose logs -f

# Stop container
docker compose down
```

---

## 7. Nginx Reverse Proxy & SSL Configuration

To expose the application to the internet securely over HTTPS (port 443) with HTTP/2 and asset caching:

### Step 1: Install Nginx & Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Configure Nginx Virtual Host
Create `/etc/nginx/sites-available/quantlab.conf`:

```nginx
# Upstream Node.js application
upstream quant_backend {
    server 127.0.0.1:3002;
    keepalive 32;
}

server {
    listen 80;
    server_name quant.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name quant.yourdomain.com;

    # SSL Certificate configuration (generated via Certbot)
    ssl_certificate /etc/letsencrypt/live/quant.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quant.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Static Assets Caching (immutable hashed bundles)
    location /assets/ {
        proxy_pass http://quant_backend;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # API and Dynamic Routes
    location / {
        proxy_pass http://quant_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

### Step 3: Enable Site & Obtain SSL Certificate
```bash
sudo ln -s /etc/nginx/sites-available/quantlab.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Generate SSL certificate
sudo certbot --nginx -d quant.yourdomain.com
```

---

## 8. Health Checks, Monitoring & Maintenance

### 8.1. API Health Check Endpoint
The backend exposes `/api/health` which reports server uptime and timestamp:

```bash
curl http://localhost:3002/api/health
```

Response:
```json
{
  "status": "ok",
  "serverTime": "2026-11-15T21:40:00.000Z"
}
```

### 8.2. Log Rotation (`/etc/logrotate.d/quant-trading`)
To prevent disk space exhaustion from continuous stdout logs:

```ini
/var/log/quant-trading/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 quantlab quantlab
}
```

### 8.3. Zero-Downtime Update Routine
When deploying an update:

```bash
cd /opt/Quant_Trading_System

# 1. Fetch updates
git pull origin main

# 2. Install any new dependencies
npm ci

# 3. Build new frontend bundle
npm run build

# 4. Gracefully restart service
sudo systemctl restart quant-trading
# Or with PM2: pm2 reload quant-trading-lab
```
