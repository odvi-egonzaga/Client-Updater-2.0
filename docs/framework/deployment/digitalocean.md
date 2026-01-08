# Client Updater Version 2 - DigitalOcean Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Client Updater Version 2 to DigitalOcean. DigitalOcean offers two main deployment options: App Platform (PaaS) and Droplets (VPS). This guide covers both approaches.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option A: App Platform Deployment](#option-a-app-platform-deployment)
3. [Option B: Droplet Deployment](#option-b-droplet-deployment)
4. [Database Setup](#database-setup)
5. [Monitoring and Logs](#monitoring-and-logs)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Prerequisites

Before deploying to DigitalOcean, ensure you have the following:

### Required Accounts

- **DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
- **Git Repository**: Your code should be hosted on GitHub, GitLab, or Bitbucket
- **Supabase Account**: For database, storage, and edge functions
- **Clerk Account**: For authentication
- **Domain Name**: (Optional) For custom domain

### Required Tools

- **Node.js**: Version 20 or higher
- **pnpm**: Version 10 or higher
- **Git**: For version control
- **SSH Client**: For Droplet access (Option B)

### Required Services

- **Supabase Project**: Configured with PostgreSQL database
- **Clerk Application**: Configured with authentication
- **Snowflake Account**: (Optional) For data warehouse integration

---

## Option A: App Platform Deployment

DigitalOcean App Platform is a Platform-as-a-Service (PaaS) solution that automatically builds and deploys your application from a Git repository.

### Step 1: Create a New App

1. Log in to [DigitalOcean Dashboard](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Select your Git provider (GitHub, GitLab, or Bitbucket)
4. Authorize DigitalOcean to access your repository
5. Select your repository and branch

### Step 2: Configure App Settings

![App Platform Configuration](../images/deployment/do-app-config.png)

Configure the following settings:

| Setting | Value | Description |
|---------|-------|-------------|
| **App Name** | `dtt-framework` | Your app name |
| **Region** | `New York` | Choose nearest region |
| **Instance Size** | `Basic XXS` | For development/testing |
| **Instance Count** | `1` | Number of instances |

### Step 3: Configure Build Settings

```yaml
# .do/app.yaml (optional)
name: dtt-framework
services:
  - name: web
    source_dir: /
    github:
      repo: your-username/your-repo
      branch: main
    run_command: pnpm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_APP_URL
        value: ${APP_URL}
```

#### Build Configuration

| Setting | Value |
|---------|-------|
| **Build Command** | `pnpm build` |
| **Run Command** | `pnpm start` |
| **Output Directory** | `.next` |
| **Install Command** | `pnpm install` |

### Step 4: Set Environment Variables

In the App Platform settings, add the following environment variables:

#### Required Variables

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.ondigitalocean.app

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake (Optional)
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST
```

### Step 5: Deploy

Click **"Create App"** to start the deployment. DigitalOcean will:

1. Clone your repository
2. Install dependencies using `pnpm install`
3. Build the application using `pnpm build`
4. Deploy to the App Platform

### Step 6: Verify Deployment

Once deployment is complete:

1. Visit your app URL: `https://your-app.ondigitalocean.app`
2. Check the deployment logs for any errors
3. Verify all features are working correctly

### Step 7: Configure Health Checks

Enable health checks for your app:

```yaml
# In App Platform settings
health_check:
  http_path: /api/health
  initial_delay_seconds: 60
  period_seconds: 30
  timeout_seconds: 5
  success_threshold: 1
  failure_threshold: 3
```

---

## Option B: Droplet Deployment

DigitalOcean Droplets provide full control over your server environment. This approach requires manual setup but offers maximum flexibility.

### Step 1: Provision a Droplet

1. Go to [DigitalOcean Dashboard](https://cloud.digitalocean.com/droplets)
2. Click **"Create Droplet"**
3. Choose an image:
   - **Ubuntu 22.04 LTS** (Recommended)
   - **Ubuntu 24.04 LTS**
4. Choose a plan:
   - **Basic**: For development/testing
   - **General Purpose**: For production
5. Choose a region (nearest to your users)
6. Add SSH keys (recommended) or choose password authentication
7. Click **"Create Droplet"**

### Step 2: Connect to Your Droplet

#### Using SSH Keys (Recommended)

```bash
# Add your SSH key to DigitalOcean
# Settings → Security → Add SSH Key

# Connect to your droplet
ssh root@your-droplet-ip
```

#### Using Password

```bash
# Connect to your droplet
ssh root@your-droplet-ip
# Enter your password when prompted
```

### Step 3: Update System Packages

```bash
# Update package list
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git vim ufw
```

### Step 4: Install Node.js

```bash
# Install Node.js 20.x using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should be 20.x.x
npm --version   # Should be 10.x.x
```

### Step 5: Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version  # Should be 10.x.x
```

### Step 6: Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx

# Enable Nginx to start on boot
systemctl enable nginx

# Verify Nginx is running
systemctl status nginx
```

### Step 7: Configure Firewall

```bash
# Allow SSH
ufw allow OpenSSH

# Allow HTTP
ufw allow 80

# Allow HTTPS
ufw allow 443

# Enable firewall
ufw enable

# Check firewall status
ufw status
```

### Step 8: Clone Your Repository

```bash
# Create application directory
mkdir -p /var/www/dtt-framework
cd /var/www/dtt-framework

# Clone your repository
git clone https://github.com/your-username/your-repo.git .

# Or use SSH
git clone git@github.com:your-username/your-repo.git .
```

### Step 9: Install Dependencies

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build
```

### Step 10: Configure Environment Variables

```bash
# Create .env file
nano /var/www/dtt-framework/.env
```

Add the following environment variables:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake (Optional)
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST
```

Save and exit (Ctrl+X, Y, Enter).

### Step 11: Run Database Migrations

```bash
# Push schema to database
pnpm db:push

# Or run migrations
pnpm db:migrate
```

### Step 12: Install PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start pnpm --name "dtt-framework" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command shown
```

### Step 13: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/dtt-framework
```

Add the following configuration:

```nginx
upstream dtt-framework {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (after SSL is configured)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://dtt-framework;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://dtt-framework;
        access_log off;
    }
}
```

Save and exit.

### Step 14: Enable Nginx Configuration

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/dtt-framework /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 15: Configure SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts to:
# - Enter email for renewal notifications
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS

# Verify SSL certificate
certbot certificates
```

Certbot will automatically configure Nginx with SSL and set up auto-renewal.

### Step 16: Verify SSL Auto-Renewal

```bash
# Test renewal process
certbot renew --dry-run

# Check renewal timer
systemctl list-timers | grep certbot
```

### Step 17: Configure PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 plus

# Monitor application
pm2 monit

# View logs
pm2 logs

# View process information
pm2 info dtt-framework
```

### Step 18: Set Up Log Rotation

```bash
# Create PM2 log rotation configuration
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Step 19: Configure Automatic Updates

```bash
# Create update script
nano /usr/local/bin/update-dtt-framework.sh
```

Add the following:

```bash
#!/bin/bash

# Navigate to application directory
cd /var/www/dtt-framework

# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build application
pnpm build

# Run migrations
pnpm db:push

# Restart PM2
pm2 restart dtt-framework

echo "Update completed successfully"
```

Make it executable:

```bash
chmod +x /usr/local/bin/update-dtt-framework.sh
```

### Step 20: Set Up Cron Job for Updates

```bash
# Edit crontab
crontab -e
```

Add the following to run updates daily at 2 AM:

```cron
0 2 * * * /usr/local/bin/update-dtt-framework.sh >> /var/log/dtt-framework-update.log 2>&1
```

---

## Database Setup

### Option 1: Use Supabase (External)

The framework is designed to work with Supabase as the primary database. This is the recommended approach for DigitalOcean deployments.

#### Configure Supabase Connection

```bash
# In your .env file
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

#### Enable Supabase Connection Pooling

For DigitalOcean deployments, use Supabase's Transaction mode:

- **Port**: 6543
- **Host**: `.pooler.supabase.com`
- **Mode**: Transaction mode

### Option 2: Use DigitalOcean Managed Database

If you prefer to use DigitalOcean's managed PostgreSQL:

#### Create a Managed Database

1. Go to [DigitalOcean Databases](https://cloud.digitalocean.com/databases)
2. Click **"Create Database Cluster"**
3. Choose **PostgreSQL**
4. Select plan and configuration
5. Create database

#### Configure Connection

```bash
# In your .env file
DATABASE_URL=postgresql://doadmin:[password]@db-postgresql-[region].do-user-[id].db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

#### Run Migrations

```bash
# On your droplet
cd /var/www/dtt-framework

# Push schema to database
pnpm db:push
```

### Database Backup Strategy

#### Automated Backups

For Supabase:
- Enable daily backups in Supabase Dashboard
- Configure point-in-time recovery

For DigitalOcean Managed Database:
- Enable automated backups (daily, weekly)
- Configure backup retention period

#### Manual Backups

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup_20231201.sql
```

---

## Monitoring and Logs

### App Platform Monitoring

#### Built-in Metrics

DigitalOcean App Platform provides:

- **CPU Usage**: Monitor CPU utilization
- **Memory Usage**: Track memory consumption
- **Response Time**: Measure request latency
- **Request Count**: Track request volume
- **Error Rate**: Monitor application errors

#### Access Logs

1. Go to **App Platform** → **Your App**
2. Click **"Deployments"** → **Your Deployment**
3. Click **"View Logs"**

#### Component Logs

1. Go to **App Platform** → **Your App**
2. Click **"Components"** → **Your Component**
3. Click **"View Logs"**

### Droplet Monitoring

#### System Monitoring

```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk usage
df -h

# Check process list
ps aux
```

#### PM2 Monitoring

```bash
# Monitor all processes
pm2 monit

# View logs
pm2 logs

# View specific process logs
pm2 logs dtt-framework

# View process info
pm2 info dtt-framework
```

#### Nginx Access Logs

```bash
# View access logs
tail -f /var/log/nginx/access.log

# View error logs
tail -f /var/log/nginx/error.log
```

#### Application Logs

```bash
# View PM2 logs
pm2 logs dtt-framework --lines 100

# View error logs only
pm2 logs dtt-framework --err --lines 100
```

### Setting Up External Monitoring

#### Uptime Monitoring

Use services like:
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring
- **StatusCake**: Website monitoring

Configure health check endpoint:
```
https://your-domain.com/api/health
```

#### Error Tracking

Integrate error tracking:
- **Sentry**: Error and performance monitoring
- **LogRocket**: Session replay and error tracking
- **Bugsnag**: Error monitoring and reporting

---

## Troubleshooting Common Issues

### Issue: App Platform Build Fails

**Symptoms:**
- Deployment fails during build
- Error messages in build logs

**Solutions:**

```bash
# Test build locally
pnpm build

# Check for missing dependencies
pnpm install

# Verify .do/app.yaml configuration
# Ensure build command is correct
```

### Issue: Droplet Application Won't Start

**Symptoms:**
- PM2 shows application as stopped
- Application crashes on startup

**Solutions:**

```bash
# Check PM2 status
pm2 status

# View PM2 logs
pm2 logs dtt-framework

# Restart application
pm2 restart dtt-framework

# Check environment variables
cat /var/www/dtt-framework/.env

# Test application manually
cd /var/www/dtt-framework
pnpm start
```

### Issue: Nginx 502 Bad Gateway

**Symptoms:**
- Nginx returns 502 error
- Application not accessible

**Solutions:**

```bash
# Check if application is running
pm2 status

# Check Nginx configuration
nginx -t

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx

# Restart application
pm2 restart dtt-framework
```

### Issue: SSL Certificate Not Renewing

**Symptoms:**
- SSL certificate expired
- HTTPS not working

**Solutions:**

```bash
# Test renewal
certbot renew --dry-run

# Manually renew
certbot renew

# Check certificate status
certbot certificates

# Reload Nginx
systemctl reload nginx
```

### Issue: Database Connection Failed

**Symptoms:**
- Database connection errors
- Application can't connect to database

**Solutions:**

```bash
# Test database connection
psql $DATABASE_URL

# Check DATABASE_URL format
# For Supabase, use Transaction mode:
# postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Check firewall rules
ufw status

# Ensure database allows connections from your IP
```

### Issue: Out of Memory

**Symptoms:**
- Application crashes
- System becomes unresponsive

**Solutions:**

```bash
# Check memory usage
free -h

# Check PM2 memory usage
pm2 monit

# Increase swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Add to /etc/fstab for persistence
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Issue: Disk Space Full

**Symptoms:**
- Application can't write files
- Logs not being written

**Solutions:**

```bash
# Check disk usage
df -h

# Find large files
du -h /var/log | sort -n | tail -20

# Clean old logs
pm2 flush

# Clean package cache
pnpm store prune

# Clean old PM2 logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
```

### Issue: High CPU Usage

**Symptoms:**
- Slow application performance
- High CPU utilization

**Solutions:**

```bash
# Check CPU usage
top

# Find CPU-intensive processes
ps aux --sort=-%cpu | head -20

# Check PM2 process stats
pm2 show dtt-framework

# Optimize application code
# - Use caching
# - Optimize database queries
# - Implement rate limiting
```

---

## Best Practices

### 1. Security

```bash
# Keep system updated
apt update && apt upgrade -y

# Use SSH keys instead of passwords
# Disable root login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Configure firewall
ufw enable
ufw allow OpenSSH
ufw allow 80
ufw allow 443
```

### 2. Backup Strategy

```bash
# Regular database backups
# Add to crontab:
0 3 * * * pg_dump $DATABASE_URL > /backups/db_$(date +\%Y\%m\%d).sql

# Backup application files
0 4 * * * tar -czf /backups/app_$(date +\%Y\%m\%d).tar.gz /var/www/dtt-framework
```

### 3. Monitoring

```bash
# Set up monitoring alerts
# Use DigitalOcean Monitoring
# Configure UptimeRobot for uptime monitoring
# Set up Sentry for error tracking
```

### 4. Performance Optimization

```bash
# Enable Nginx caching
# Configure gzip compression
# Use CDN for static assets
# Optimize images
```

### 5. Documentation

```bash
# Document your setup
# Keep track of configurations
# Maintain change logs
# Document troubleshooting steps
```

---

## Comparison: App Platform vs Droplet

| Feature | App Platform | Droplet |
|---------|--------------|---------|
| **Ease of Use** | High | Medium |
| **Setup Time** | Minutes | Hours |
| **Control** | Limited | Full |
| **Scalability** | Auto-scaling | Manual |
| **Cost** | Higher | Lower |
| **Best For** | Quick deployment | Custom configurations |

---

## Related Documentation

- [Domain Setup](./domain-setup.md) - Custom domain configuration
- [Environment Variables](./environment-variables.md) - Complete variable reference
- [CI/CD Setup](./ci-cd.md) - Automated deployments
- [Production Checklist](./production-checklist.md) - Pre-deployment checklist
- [Monitoring](./monitoring.md) - Monitoring and alerting setup
- [Vercel Deployment](./vercel.md) - Alternative deployment platform
