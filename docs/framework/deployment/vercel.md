# Client Updater Version 2 - Vercel Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Client Updater Version 2 to Vercel. Vercel is the recommended deployment platform for Next.js applications, offering seamless integration, automatic scaling, and excellent developer experience.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [Deployment via Vercel CLI](#deployment-via-vercel-cli)
4. [Deployment via Vercel Dashboard](#deployment-via-vercel-dashboard)
5. [Environment Variables Setup](#environment-variables-setup)
6. [Database Migrations Setup](#database-migrations-setup)
7. [Clerk Webhook Configuration](#clerk-webhook-configuration)
8. [Monitoring and Logs](#monitoring-and-logs)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Prerequisites

Before deploying to Vercel, ensure you have the following:

### Required Accounts

- **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
- **Git Repository**: Your code should be hosted on GitHub, GitLab, or Bitbucket
- **Supabase Account**: For database, storage, and edge functions
- **Clerk Account**: For authentication

### Required Tools

- **Node.js**: Version 20 or higher
- **pnpm**: Version 10 or higher (package manager)
- **Git**: For version control

### Required Services

- **Supabase Project**: Configured with PostgreSQL database
- **Clerk Application**: Configured with authentication
- **Snowflake Account**: (Optional) For data warehouse integration

---

## Pre-Deployment Setup

### 1. Verify Local Configuration

Ensure your local environment is properly configured:

```bash
# Check Node.js version
node --version  # Should be 20+

# Check pnpm version
pnpm --version  # Should be 10+

# Verify .env file exists
ls -la .env

# Verify dependencies are installed
pnpm install
```

### 2. Test Local Build

Before deploying, verify the build works locally:

```bash
# Build the application
pnpm build

# Run production build locally
pnpm start
```

### 3. Verify Database Connection

Ensure your database connection works:

```bash
# Push schema to database
pnpm db:push

# Or run migrations
pnpm db:migrate
```

### 4. Configure Build Settings

Verify your `next.config.js` is properly configured:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel-specific optimizations
  output: 'standalone',
  
  // Environment variables for client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

export default nextConfig
```

### 5. Prepare Git Repository

Ensure your repository is ready for deployment:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit"

# Push to remote repository
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

---

## Deployment via Vercel CLI

### Install Vercel CLI

```bash
# Install Vercel CLI globally
pnpm add -g vercel

# Verify installation
vercel --version
```

### Login to Vercel

```bash
# Login to your Vercel account
vercel login
```

This will open a browser window for authentication.

### Deploy Your Application

```bash
# Deploy to preview environment
vercel

# Deploy to production
vercel --prod
```

### Configure Project Settings

During the first deployment, Vercel will ask for configuration:

```bash
? Set up and deploy "~/your-project"? [Y/n] Y
? Which scope do you want to deploy to? Your Username
? Link to existing project? [y/N] N
? What's your project's name? dtt-framework
? In which directory is your code located? ./
? Want to override the settings? [y/N] N
```

### Set Environment Variables via CLI

```bash
# Add environment variables
vercel env add DATABASE_URL production
vercel env add CLERK_SECRET_KEY production
vercel env add CLERK_WEBHOOK_SECRET production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Pull environment variables locally
vercel env pull .env.production
```

### Deploy with Environment Variables

```bash
# Deploy to production with all environment variables
vercel --prod
```

---

## Deployment via Vercel Dashboard

### Step 1: Import Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository

### Step 2: Configure Project Settings

![Import Project](../images/deployment/vercel-import-project.png)

Configure the following settings:

| Setting | Value | Description |
|---------|-------|-------------|
| **Framework Preset** | Next.js | Automatically detected |
| **Root Directory** | `./` | Leave as default |
| **Build Command** | `pnpm build` | Build command |
| **Output Directory** | `.next` | Default for Next.js |
| **Install Command** | `pnpm install` | Package installation |

### Step 3: Configure Environment Variables

In the project settings, add the following environment variables:

#### Required Variables

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

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

#### Environment-Specific Variables

Create separate sets for each environment:

| Environment | Prefix |
|-------------|--------|
| **Production** | No prefix (default) |
| **Preview** | `PREVIEW_` |
| **Development** | `DEV_` |

### Step 4: Deploy

Click **"Deploy"** to start the deployment process. Vercel will:

1. Clone your repository
2. Install dependencies using `pnpm install`
3. Build the application using `pnpm build`
4. Deploy to Vercel's Edge Network

### Step 5: Verify Deployment

Once deployment is complete:

1. Visit your production URL: `https://your-app.vercel.app`
2. Check the deployment logs for any errors
3. Verify all features are working correctly

---

## Environment Variables Setup

### Understanding Vercel Environment Variables

Vercel supports multiple environments:

| Environment | Use Case | Branch |
|-------------|----------|--------|
| **Production** | Live application | `main` or `master` |
| **Preview** | Pull request deployments | Pull request branches |
| **Development** | Testing environment | `dev` branch |

### Setting Variables in Dashboard

1. Go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Enter variable name and value
4. Select environments (Production, Preview, Development)
5. Click **"Save"**

### Setting Variables via CLI

```bash
# Add variable to specific environment
vercel env add VARIABLE_NAME production

# List all variables
vercel env ls

# Remove variable
vercel env rm VARIABLE_NAME production
```

### Variable Scope

Variables can be scoped to:

- **All Environments**: Available in production, preview, and development
- **Specific Environments**: Only available in selected environments
- **Branch-Specific**: Only available for specific Git branches

### Sensitive Variables

For sensitive variables, Vercel provides:

- **Encrypted Storage**: All variables are encrypted at rest
- **Access Control**: Only team members with appropriate permissions can view
- **Audit Logs**: Track who accessed or modified variables

---

## Database Migrations Setup

### Option 1: Automatic Migrations on Deploy

Create a deployment script to run migrations:

```json
// package.json
{
  "scripts": {
    "postinstall": "pnpm db:push"
  }
}
```

This will automatically push schema changes after each deployment.

### Option 2: Manual Migrations

For production, run migrations manually:

```bash
# Generate migration
pnpm db:generate

# Push to database
pnpm db:push

# Or run specific migration
pnpm db:migrate
```

### Option 3: Vercel Cron Jobs

Set up scheduled migrations using Vercel Cron Jobs:

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/migrate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Database Migration Best Practices

1. **Test Locally First**: Always test migrations locally
2. **Backup Before Migrate**: Create database backups before production migrations
3. **Use Transactions**: Wrap migrations in transactions for rollback capability
4. **Monitor Performance**: Track migration performance in production
5. **Document Changes**: Keep a changelog of schema changes

---

## Clerk Webhook Configuration

### Step 1: Get Your Deployment URL

Your Vercel deployment URL will be:
```
https://your-project.vercel.app
```

Or your custom domain:
```
https://your-app.com
```

### Step 2: Configure Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Your App** → **Webhooks**
3. Click **"Add Endpoint"**
4. Enter your webhook URL:
   ```
   https://your-app.vercel.app/api/webhooks/clerk
   ```
5. Select events to listen for:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `session.created`
   - `session.ended`
6. Click **"Create"**

### Step 3: Copy Webhook Secret

After creating the webhook:

1. Click on the webhook endpoint
2. Copy the **Signing Secret** (starts with `whsec_`)
3. Add it to Vercel environment variables:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_xxx
   ```

### Step 4: Test Webhook

1. In Clerk Dashboard, go to **Webhooks** → **Your Webhook**
2. Click **"Send test event"**
3. Select an event type
4. Click **"Send"`
5. Check Vercel logs for successful delivery

### Step 5: Verify Webhook Delivery

Check Vercel logs:

```bash
# View deployment logs
vercel logs

# View real-time logs
vercel logs --follow
```

---

## Monitoring and Logs

### Vercel Analytics

Enable Vercel Analytics for performance insights:

```bash
# Install Vercel Analytics
pnpm add @vercel/analytics
```

Add to your app:

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Viewing Logs

#### Via Dashboard

1. Go to **Deployments** → **Your Deployment**
2. Click **"View Function Logs"**
3. Filter by function or time range

#### Via CLI

```bash
# View recent logs
vercel logs

# View logs for specific deployment
vercel logs <deployment-url>

# Follow logs in real-time
vercel logs --follow

# View logs for specific function
vercel logs --filter="api/health"
```

### Log Types

| Log Type | Description | Use Case |
|----------|-------------|----------|
| **Build Logs** | Build process output | Debugging build failures |
| **Function Logs** | Serverless function execution | Debugging runtime errors |
| **Edge Function Logs** | Edge function execution | Debugging edge-specific issues |
| **Deployment Logs** | Deployment process | Tracking deployment status |

### Setting Up Alerts

Configure alerts for:

1. **Build Failures**: Get notified when builds fail
2. **Deployment Errors**: Get notified for deployment issues
3. **Function Errors**: Get notified for runtime errors
4. **Performance Issues**: Get notified for slow responses

---

## Rollback Procedures

### Automatic Rollback

Vercel provides automatic rollback on deployment failure:

1. If a deployment fails, Vercel automatically reverts to the previous successful deployment
2. Your application remains available during rollback
3. No manual intervention required

### Manual Rollback via Dashboard

1. Go to **Deployments** → **Your Project**
2. Find the previous successful deployment
3. Click **"..."** → **"Promote to Production"**
4. Confirm the rollback

### Manual Rollback via CLI

```bash
# List all deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-url>

# Rollback to previous deployment
vercel rollback
```

### Rollback Best Practices

1. **Test Before Deploy**: Always test preview deployments
2. **Monitor After Deploy**: Watch logs after deployment
3. **Have Rollback Plan**: Know which deployment to rollback to
4. **Document Rollbacks**: Keep a record of rollbacks and reasons
5. **Investigate Failures**: Understand why rollback was needed

---

## Troubleshooting Common Issues

### Issue: Build Fails

**Symptoms:**
- Deployment fails during build
- Error messages in build logs

**Solutions:**

```bash
# Test build locally
pnpm build

# Check for missing dependencies
pnpm install

# Verify environment variables
vercel env ls

# Clear Vercel cache
vercel build --force
```

### Issue: Environment Variables Not Available

**Symptoms:**
- Application can't access environment variables
- `undefined` values for environment variables

**Solutions:**

```bash
# Verify variables are set
vercel env ls

# Redeploy to apply changes
vercel --prod

# Check variable names match exactly (case-sensitive)
```

### Issue: Database Connection Failed

**Symptoms:**
- Database connection errors in logs
- Application can't connect to Supabase

**Solutions:**

```bash
# Verify DATABASE_URL format
# Should use Transaction mode for Vercel:
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Test connection locally
psql $DATABASE_URL

# Check Supabase project status
# Ensure project is not paused
```

### Issue: Clerk Webhook Not Working

**Symptoms:**
- Webhook events not being received
- User data not syncing to database

**Solutions:**

```bash
# Verify webhook secret is correct
vercel env ls CLERK_WEBHOOK_SECRET

# Check webhook URL is correct
# Should be: https://your-app.vercel.app/api/webhooks/clerk

# Test webhook from Clerk Dashboard
# Send test event and check Vercel logs
```

### Issue: Slow Performance

**Symptoms:**
- Slow page load times
- High response times

**Solutions:**

```bash
# Enable Vercel Analytics
pnpm add @vercel/analytics

# Check Vercel Analytics dashboard
# Identify slow pages and functions

# Optimize images
# Use next/image for all images

# Enable caching
# Add appropriate cache headers
```

### Issue: Edge Function Errors

**Symptoms:**
- Edge function failures
- Timeouts or errors

**Solutions:**

```bash
# Check edge function logs
vercel logs --filter="edge"

# Increase timeout if needed
# In next.config.js:
experimental: {
  serverActions: {
    bodySizeLimit: '2mb',
  },
}

# Optimize edge function code
# Reduce bundle size
```

### Issue: Deployment Stuck

**Symptoms:**
- Deployment hangs indefinitely
- No progress in deployment logs

**Solutions:**

```bash
# Cancel current deployment
# In Vercel Dashboard: Click "Cancel Deployment"

# Retry deployment
vercel --prod

# Check Vercel status
# https://www.vercel-status.com/
```

---

## Best Practices

### 1. Use Preview Deployments

Always use preview deployments for testing:

```bash
# Create a pull request
git checkout -b feature/new-feature
git push origin feature/new-feature

# Vercel automatically creates preview deployment
```

### 2. Monitor Deployments

Keep an eye on your deployments:

- Check deployment status after each push
- Review logs for any warnings or errors
- Set up alerts for critical issues

### 3. Optimize Build Time

Reduce build time:

```bash
# Use pnpm for faster installs
# Cache dependencies in .vercelignore

# .vercelignore
node_modules
.next
```

### 4. Use Environment-Specific Configs

Separate configurations for different environments:

```javascript
// next.config.js
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  // Production-specific settings
  ...(isProd && {
    compress: true,
    swcMinify: true,
  }),
}
```

### 5. Implement Health Checks

Set up health check endpoints:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: Date.now() })
}
```

---

## Related Documentation

- [Domain Setup](./domain-setup.md) - Custom domain configuration
- [Environment Variables](./environment-variables.md) - Complete variable reference
- [CI/CD Setup](./ci-cd.md) - Automated deployments
- [Production Checklist](./production-checklist.md) - Pre-deployment checklist
- [Monitoring](./monitoring.md) - Monitoring and alerting setup
- [DigitalOcean Deployment](./digitalocean.md) - Alternative deployment platform
