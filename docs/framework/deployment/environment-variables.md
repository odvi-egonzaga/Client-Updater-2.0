# DTT Framework - Deployment Environment Variables

## Overview

This document provides a comprehensive guide to managing environment variables for deploying the DTT Framework. It covers the complete list of required variables, platform-specific configurations, security best practices, and credential management.

---

## Table of Contents

1. [Complete List of Required Environment Variables](#complete-list-of-required-environment-variables)
2. [Platform-Specific Configuration](#platform-specific-configuration)
3. [Security Best Practices](#security-best-practices)
4. [Managing Secrets](#managing-secrets)
5. [Rotating Credentials](#rotating-credentials)
6. [Environment Variable Templates](#environment-variable-templates)

---

## Complete List of Required Environment Variables

### Application Variables

| Variable Name | Type | Required | Description | Example |
|---------------|------|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Base URL of your application | `https://your-app.com` |
| `NODE_ENV` | Server | Yes | Node environment | `production` |

### Clerk Authentication Variables

| Variable Name | Type | Required | Description | Example |
|---------------|------|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Yes | Clerk publishable key (client-side) | `pk_live_xxx` |
| `CLERK_SECRET_KEY` | Server | Yes | Clerk secret key (server-side) | `sk_live_xxx` |
| `CLERK_WEBHOOK_SECRET` | Server | Yes | Clerk webhook signing secret | `whsec_xxx` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | Yes | Sign-in page URL | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | Yes | Sign-up page URL | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Public | Yes | Redirect URL after sign-in | `/health` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Public | Yes | Redirect URL after sign-up | `/health` |

### Supabase Variables

| Variable Name | Type | Required | Description | Example |
|---------------|------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Supabase anonymous key | `eyJxxx` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Supabase service role key | `eyJxxx` |
| `DATABASE_URL` | Server | Yes | PostgreSQL connection string | `postgresql://user:pass@host:6543/db` |

### Snowflake Variables (Optional)

| Variable Name | Type | Required | Description | Example |
|---------------|------|----------|-------------|---------|
| `SNOWFLAKE_ACCOUNT` | Server | No | Snowflake account identifier | `xxx.us-east-1` |
| `SNOWFLAKE_USERNAME` | Server | No | Snowflake username | `myuser` |
| `SNOWFLAKE_PASSWORD` | Server | No | Snowflake password | `mypassword` |
| `SNOWFLAKE_WAREHOUSE` | Server | No | Snowflake warehouse name | `COMPUTE_WH` |
| `SNOWFLAKE_DATABASE` | Server | No | Snowflake database name | `ANALYTICS` |
| `SNOWFLAKE_SCHEMA` | Server | No | Snowflake schema name | `PUBLIC` |
| `SNOWFLAKE_ROLE` | Server | No | Snowflake role name | `ANALYST` |

### NextBank Variables (Placeholder, Optional)

| Variable Name | Type | Required | Description | Example |
|---------------|------|----------|-------------|---------|
| `NEXTBANK_API` | Server | No | NextBank API endpoint | `https://api.nextbank.com` |
| `NEXTBANK_API_USERNAME` | Server | No | NextBank API username | `user` |
| `NEXTBANK_API_PASSWORD` | Server | No | NextBank API password | `pass` |

---

## Platform-Specific Configuration

### Vercel Configuration

#### Setting Variables via Dashboard

1. Go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Enter variable name and value
4. Select environments (Production, Preview, Development)
5. Click **"Save"**

#### Setting Variables via CLI

```bash
# Add variable to production
vercel env add DATABASE_URL production

# Add variable to all environments
vercel env add NEXT_PUBLIC_APP_URL

# List all variables
vercel env ls

# Pull variables locally
vercel env pull .env.production
```

#### Environment-Specific Variables

Vercel supports three environments:

| Environment | Use Case | Branch |
|-------------|----------|--------|
| **Production** | Live application | `main` or `master` |
| **Preview** | Pull request deployments | Pull request branches |
| **Development** | Testing environment | `dev` branch |

#### Vercel .env.example

```bash
# ============================================
# DTT Framework - Vercel Environment Variables
# ============================================

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

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

### DigitalOcean App Platform Configuration

#### Setting Variables via Dashboard

1. Go to **App Platform** → **Your App** → **Settings**
2. Scroll to **Environment Variables**
3. Click **"Add Variable"**
4. Enter variable name and value
5. Click **"Save"**

#### Setting Variables via doctl CLI

```bash
# Install doctl
snap install doctl

# Authenticate
doctl auth init

# Add variable to app
doctl apps create-deployment <app-id> --env DATABASE_URL="postgresql://..."

# List variables
doctl apps spec <app-id>
```

#### DigitalOcean App Platform .env.example

```bash
# ============================================
# DTT Framework - DigitalOcean App Platform
# ============================================

# Application
NEXT_PUBLIC_APP_URL=https://your-app.ondigitalocean.app
NODE_ENV=production

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

### DigitalOcean Droplet Configuration

#### Setting Variables via File

```bash
# Create .env file
nano /var/www/dtt-framework/.env
```

Add environment variables:

```bash
# ============================================
# DTT Framework - DigitalOcean Droplet
# ============================================

# Application
NEXT_PUBLIC_APP_URL=https://your-app.com
NODE_ENV=production

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

#### Secure the .env File

```bash
# Set correct permissions
chmod 600 /var/www/dtt-framework/.env

# Verify permissions
ls -la /var/www/dtt-framework/.env
```

#### Restart Application After Changes

```bash
# Restart PM2 application
pm2 restart dtt-framework

# Or reload without downtime
pm2 reload dtt-framework
```

### GitHub Actions Configuration

#### Setting Variables via GitHub Secrets

1. Go to **Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Enter secret name and value
4. Click **"Add secret"**

#### Using Secrets in Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Build application
        env:
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: pnpm build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Security Best Practices

### 1. Never Commit .env Files

Always add `.env` to `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Also ignore secrets files
*.key
*.pem
secrets/
```

### 2. Use Environment-Specific Files

Use different environment files for different stages:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

Load appropriate file based on environment:

```bash
# In package.json scripts
"dev": "cp .env.development .env && next dev",
"build:staging": "cp .env.staging .env && next build",
"build:production": "cp .env.production .env && next build"
```

### 3. Prefix Client Variables

Only prefix variables with `NEXT_PUBLIC_` if they need to be exposed to client:

```bash
# ✅ Good - Exposed to client (safe)
NEXT_PUBLIC_APP_URL=https://your-app.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx

# ❌ Bad - Not exposed, but might be needed
APP_URL=https://your-app.com
CLERK_PUBLISHABLE_KEY=pk_live_xxx

# ✅ Good - Server-side only (secure)
DATABASE_URL=postgresql://user:pass@host:6543/db
CLERK_SECRET_KEY=sk_live_xxx
```

### 4. Validate Environment Variables

The framework uses `@t3-oss/env-nextjs` for validation:

```typescript
// src/config/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().startsWith('sk_'),
    CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
})
```

This ensures:
- All required variables are present
- Variables are correctly formatted
- Build fails if variables are missing

### 5. Use Secret Management Services

For production, consider using secret management:

| Service | Platform | Description |
|---------|----------|-------------|
| **Vercel Environment Variables** | Vercel | Built-in secret management |
| **DigitalOcean App Platform** | DigitalOcean | Built-in secret management |
| **GitHub Secrets** | GitHub Actions | CI/CD secrets |
| **AWS Secrets Manager** | AWS | Enterprise secret management |
| **HashiCorp Vault** | Multi-cloud | Advanced secret management |
| **1Password Secrets Automation** | Multi-cloud | Password manager integration |

### 6. Implement Least Privilege

Use the minimum required permissions for each key:

| Key Type | Permissions | Use Case |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Limited (RLS) | Client-side operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Full access | Server-side operations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Read-only | Client-side auth |
| `CLERK_SECRET_KEY` | Full access | Server-side auth |

### 7. Rotate Secrets Regularly

Establish a secret rotation schedule:

| Secret Type | Rotation Frequency |
|-------------|-------------------|
| API Keys | Every 90 days |
| Database Passwords | Every 180 days |
| Webhook Secrets | When compromised |
| Service Role Keys | Every 180 days |

### 8. Audit Access to Secrets

Track who has access to secrets:

```bash
# Vercel: Check team member access
# Dashboard → Team → Members

# GitHub: Check secret access
# Settings → Secrets and variables → Actions

# DigitalOcean: Check team access
# Dashboard → Team → Members
```

---

## Managing Secrets

### Secret Management Strategies

#### 1. Environment Variable Files

Use `.env` files for local development:

```bash
# .env.local (not committed)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
CLERK_SECRET_KEY=sk_test_xxx
```

#### 2. Secret Management Tools

Use tools like:

- **direnv**: Load environment variables automatically
- **dotenv**: Load variables from `.env` files
- **envsubst**: Substitute variables in files

#### 3. Encrypted Secrets

Use encryption for sensitive secrets:

```bash
# Using OpenSSL
openssl enc -aes-256-cbc -salt -in secret.txt -out secret.enc

# Decrypt
openssl enc -aes-256-cbc -d -in secret.enc -out secret.txt
```

### Secret Storage Options

#### Option 1: Platform-Native Storage

| Platform | Storage Method | Security |
|----------|---------------|----------|
| **Vercel** | Environment Variables | Encrypted at rest |
| **DigitalOcean App Platform** | Environment Variables | Encrypted at rest |
| **DigitalOcean Droplet** | File system | Manual encryption needed |

#### Option 2: Third-Party Secret Managers

| Tool | Features | Cost |
|------|----------|------|
| **AWS Secrets Manager** | Auto-rotation, audit logs | Paid |
| **HashiCorp Vault** | Advanced features | Open source + Paid |
| **1Password** | UI-based, team sharing | Paid |
| **Infisical** | Open source, syncs to platforms | Free tier available |

### Secret Access Control

#### Grant Access by Role

```yaml
# Example: Role-based access
roles:
  - developer:
      secrets: [DATABASE_URL, API_KEY]
  - devops:
      secrets: [DATABASE_URL, API_KEY, CLERK_SECRET_KEY]
  - admin:
      secrets: [ALL_SECRETS]
```

#### Use Temporary Credentials

For CI/CD, use temporary credentials:

```yaml
# GitHub Actions example
jobs:
  deploy:
    steps:
      - name: Get temporary credentials
        id: creds
        run: |
          TOKEN=$(curl -X POST https://api.example.com/creds)
          echo "::add-mask::$TOKEN"
          echo "::set-output name=token::$TOKEN"
```

---

## Rotating Credentials

### Rotation Strategy

#### 1. Plan Rotation

Create a rotation plan:

| Step | Description | Timeline |
|------|-------------|----------|
| **Preparation** | Generate new credentials | Day 1 |
| **Testing** | Test new credentials in staging | Day 2 |
| **Deployment** | Deploy new credentials to production | Day 3 |
| **Verification** | Verify application works | Day 3 |
| **Cleanup** | Revoke old credentials | Day 7 |

#### 2. Rotate Clerk Keys

```bash
# 1. Generate new keys in Clerk Dashboard
# Dashboard → Your App → API Keys → Rotate

# 2. Update environment variables
vercel env add CLERK_SECRET_KEY production

# 3. Redeploy application
vercel --prod

# 4. Verify authentication works
# Test sign-in/sign-up flows

# 5. Revoke old keys (after 7 days)
# Clerk Dashboard → API Keys → Revoke
```

#### 3. Rotate Supabase Keys

```bash
# 1. Generate new keys in Supabase Dashboard
# Dashboard → Settings → API → Rotate

# 2. Update environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 3. Redeploy application
vercel --prod

# 4. Verify database operations work
# Test database queries

# 5. Revoke old keys (after 7 days)
# Supabase Dashboard → Settings → API → Revoke
```

#### 4. Rotate Database Password

```bash
# 1. Generate new password
# Use a password manager

# 2. Update database password
# Supabase Dashboard → Settings → Database → Password

# 3. Update DATABASE_URL
vercel env add DATABASE_URL production

# 4. Redeploy application
vercel --prod

# 5. Verify database connection
# Test database operations
```

### Automated Rotation

#### Using Cron Jobs

```bash
# Set up automated rotation check
# Add to crontab:
0 0 1 * * /usr/local/bin/check-rotation.sh
```

#### Using CI/CD

```yaml
# .github/workflows/rotate-secrets.yml
name: Rotate Secrets

on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Check secret age
        run: |
          # Check if secrets need rotation
          # Trigger rotation if needed
```

---

## Environment Variable Templates

### Development Template (.env.development)

```bash
# ============================================
# DTT Framework - Development Environment
# ============================================

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Clerk Authentication (Test Mode)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# Supabase (Development Project)
NEXT_PUBLIC_SUPABASE_URL=https://xxx-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake (Optional - Test Account)
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST
```

### Staging Template (.env.staging)

```bash
# ============================================
# DTT Framework - Staging Environment
# ============================================

# Application
NEXT_PUBLIC_APP_URL=https://staging.your-app.com
NODE_ENV=production

# Clerk Authentication (Test Mode)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# Supabase (Staging Project)
NEXT_PUBLIC_SUPABASE_URL=https://xxx-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake (Optional - Test Account)
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST
```

### Production Template (.env.production)

```bash
# ============================================
# DTT Framework - Production Environment
# ============================================

# Application
NEXT_PUBLIC_APP_URL=https://your-app.com
NODE_ENV=production

# Clerk Authentication (Live Mode)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health

# Supabase (Production Project)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Snowflake (Optional - Production Account)
SNOWFLAKE_ACCOUNT=xxx.us-east-1
SNOWFLAKE_USERNAME=xxx
SNOWFLAKE_PASSWORD=xxx
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ANALYTICS
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=ANALYST
```

---

## Troubleshooting

### Issue: Environment Variables Not Loading

**Symptoms:**
- Application can't access environment variables
- `undefined` values for environment variables

**Solutions:**

```bash
# Verify .env file exists
ls -la .env

# Check file permissions
chmod 600 .env

# Restart application
pm2 restart dtt-framework

# Check for typos in variable names
# Environment variables are case-sensitive
```

### Issue: Build Fails Due to Missing Variables

**Symptoms:**
- Build process fails
- Error about missing environment variables

**Solutions:**

```bash
# Verify all required variables are set
vercel env ls

# Check variable names match exactly
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (correct)
# next_public_clerk_publishable_key (incorrect)

# For local builds, verify .env file
cat .env
```

### Issue: Variables Not Available in Production

**Symptoms:**
- Variables work in development but not production
- Application fails in production

**Solutions:**

```bash
# Verify variables are set for production environment
vercel env ls --environment=production

# Redeploy to apply changes
vercel --prod

# Check deployment logs
vercel logs
```

---

## Related Documentation

- [Vercel Deployment](./vercel.md) - Vercel deployment guide
- [DigitalOcean Deployment](./digitalocean.md) - DigitalOcean deployment guide
- [Domain Setup](./domain-setup.md) - Custom domain configuration
- [CI/CD Setup](./ci-cd.md) - Automated deployments
- [Production Checklist](./production-checklist.md) - Pre-deployment checklist
- [Monitoring](./monitoring.md) - Monitoring and alerting setup
- [Framework Environment Variables](../environment-variables.md) - Complete variable reference
