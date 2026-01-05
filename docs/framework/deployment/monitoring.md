# DTT Framework - Monitoring and Alerting Guide

## Overview

This guide provides comprehensive instructions for setting up monitoring, health checks, error tracking, performance monitoring, and uptime monitoring for the DTT Framework.

---

## Table of Contents

1. [Setting Up Monitoring](#setting-up-monitoring)
2. [Health Check Monitoring](#health-check-monitoring)
3. [Error Tracking](#error-tracking)
4. [Performance Monitoring](#performance-monitoring)
5. [Uptime Monitoring](#uptime-monitoring)

---

## Setting Up Monitoring

### Overview of Monitoring Stack

A comprehensive monitoring stack includes:

| Component | Purpose | Tools |
|-----------|---------|-------|
| **Application Monitoring** | Track application health | Vercel Analytics, Datadog |
| **Error Tracking** | Capture and analyze errors | Sentry, Rollbar |
| **Performance Monitoring** | Measure performance metrics | Lighthouse, Web Vitals |
| **Uptime Monitoring** | Monitor service availability | UptimeRobot, Pingdom |
| **Log Management** | Aggregate and search logs | Logtail, Papertrail |
| **Database Monitoring** | Track database performance | Supabase Dashboard |

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Next.js App  │  │ API Routes   │  │ Edge Functions│   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Analytics  │  │ Error Track  │  │   Health     │
│   (Vercel)   │  │   (Sentry)   │  │   Checks     │
└──────────────┘  └──────────────┘  └──────────────┘
         │                │                │
         └────────────────┼────────────────┘
                          ▼
              ┌──────────────────────┐
              │   Monitoring Dashboard │
              └──────────────────────┘
```

---

## Health Check Monitoring

### Built-in Health Check Endpoint

The framework includes a health check endpoint at `/api/health`:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkClerk(),
    checkSupabase(),
    checkSnowflake(),
  ])

  const status = checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded'

  return Response.json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: formatCheck(checks[0]),
      clerk: formatCheck(checks[1]),
      supabase: formatCheck(checks[2]),
      snowflake: formatCheck(checks[3]),
    },
  })
}
```

### Health Check Response Format

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "status": "ok",
      "responseTime": 45,
      "message": "Connected successfully"
    },
    "clerk": {
      "status": "ok",
      "responseTime": 32,
      "message": "API accessible"
    },
    "supabase": {
      "status": "ok",
      "responseTime": 28,
      "message": "Service operational"
    },
    "snowflake": {
      "status": "ok",
      "responseTime": 156,
      "message": "Warehouse accessible"
    }
  }
}
```

### Configuring Health Checks in Vercel

#### Via Dashboard

1. Go to **Settings** → **Health Checks**
2. Add health check:
   - **Path**: `/api/health`
   - **Interval**: 30 seconds
   - **Timeout**: 5 seconds
   - **Threshold**: 3 failures

#### Via vercel.json

```json
{
  "healthChecks": [
    {
      "path": "/api/health",
      "interval": 30000,
      "timeout": 5000,
      "threshold": 3
    }
  ]
}
```

### Configuring Health Checks in DigitalOcean

#### App Platform

```yaml
# .do/app.yaml
health_check:
  http_path: /api/health
  initial_delay_seconds: 60
  period_seconds: 30
  timeout_seconds: 5
  success_threshold: 1
  failure_threshold: 3
```

#### Droplet (Nginx)

```nginx
# Add to Nginx configuration
location /api/health {
    access_log off;
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
}
```

### Custom Health Checks

Create custom health checks for specific services:

```typescript
// src/lib/health-checks/database.ts
export async function checkDatabase() {
  const start = Date.now()
  try {
    await db.select().from(users).limit(1)
    return {
      status: 'ok',
      responseTime: Date.now() - start,
      message: 'Database connection successful',
    }
  } catch (error) {
    return {
      status: 'error',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// src/lib/health-checks/clerk.ts
export async function checkClerk() {
  const start = Date.now()
  try {
    await clerkClient.users.getUserList({ limit: 1 })
    return {
      status: 'ok',
      responseTime: Date.now() - start,
      message: 'Clerk API accessible',
    }
  } catch (error) {
    return {
      status: 'error',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

### Health Check Best Practices

| Practice | Description |
|-----------|-------------|
| **Fast Response** | Health checks should complete in <100ms |
| **No Side Effects** | Health checks should not modify data |
| **Consistent** | Same response format for all checks |
| **Comprehensive** | Check all critical services |
| **Actionable** | Provide clear error messages |

---

## Error Tracking

### Setting Up Sentry

#### Step 1: Install Sentry SDK

```bash
# Install Sentry SDK
pnpm add @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs
```

#### Step 2: Configure Sentry

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

#### Step 3: Add Environment Variables

```bash
# Add to .env or platform secrets
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
```

#### Step 4: Configure Source Maps

```javascript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig(
  {
    // Your Next.js config
  },
  {
    silent: true,
    org: 'your-org',
    project: 'your-project',
  }
)
```

### Error Types to Track

| Error Type | Severity | Action Required |
|------------|----------|-----------------|
| **JavaScript Errors** | High | Immediate investigation |
| **API Errors (5xx)** | Critical | Immediate investigation |
| **API Errors (4xx)** | Medium | Monitor and investigate |
| **Database Errors** | Critical | Immediate investigation |
| **Authentication Errors** | High | Investigate and fix |

### Error Alerting

Configure alerts in Sentry:

1. Go to **Settings** → **Alerts**
2. Create new alert:
   - **Condition**: Error rate >1% for 5 minutes
   - **Notification**: Email, Slack, PagerDuty
   - **Severity**: Critical

### Custom Error Context

Add custom context to errors:

```typescript
try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'user-authentication',
      action: 'sign-in',
    },
    extra: {
      userId: 'user-123',
      timestamp: new Date().toISOString(),
    },
  })
}
```

### Error Tracking Best Practices

| Practice | Description |
|-----------|-------------|
| **Capture Context** | Include user and request context |
| **Group Errors** | Group similar errors together |
| **Set Severity** | Prioritize errors by severity |
| **Filter Noise** | Ignore expected errors |
| **Review Regularly** | Review errors daily |

---

## Performance Monitoring

### Vercel Analytics

#### Installation

```bash
# Install Vercel Analytics
pnpm add @vercel/analytics
```

#### Integration

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

#### Custom Events

```typescript
import { Analytics } from '@vercel/analytics/react'

// Track custom events
Analytics.track('user_sign_in', {
  method: 'email',
  plan: 'premium',
})
```

### Web Vitals Monitoring

#### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|------------------|-------|
| **LCP** | <2.5s | 2.5s-4s | >4s |
| **FID** | <100ms | 100ms-300ms | >300ms |
| **CLS** | <0.1 | 0.1-0.25 | >0.25 |

#### Monitoring Web Vitals

```typescript
// src/app/layout.tsx
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(metric),
    })
  })

  return null
}
```

### Database Performance Monitoring

#### Supabase Dashboard

1. Go to **Supabase Dashboard** → **Reports**
2. Monitor:
   - Query performance
   - Connection pool usage
   - Database size
   - Storage usage

#### Slow Query Monitoring

```sql
-- Enable slow query logging
ALTER DATABASE postgres SET log_min_duration_statement = 1000;

-- View slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### API Performance Monitoring

#### Track API Response Times

```typescript
// Middleware to track API performance
export async function middleware(request: NextRequest) {
  const start = Date.now()

  const response = await NextResponse.next()

  const duration = Date.now() - start

  // Log slow requests
  if (duration > 1000) {
    console.warn(`Slow request: ${request.url} took ${duration}ms`)
  }

  response.headers.set('x-response-time', `${duration}ms`)

  return response
}
```

### Performance Budgets

#### Define Budgets

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}
```

#### Monitor Budgets

Use tools like:
- **Lighthouse CI**: Automated performance testing
- **Bundlephobia**: Analyze bundle size
- **Webpack Bundle Analyzer**: Visualize bundle size

### Performance Monitoring Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **Vercel Analytics** | Web vitals, traffic | Free |
| **Lighthouse** | Page performance | Free |
| **WebPageTest** | Detailed performance | Free |
| **GTmetrix** | Performance analysis | Free/Paid |
| **SpeedCurve** | Performance monitoring | Paid |
| **Datadog** | APM | Paid |

---

## Uptime Monitoring

### UptimeRobot Setup

#### Step 1: Create Account

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Verify your email

#### Step 2: Add Monitor

1. Click **"Add New Monitor"**
2. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: DTT Framework Production
   - **URL**: `https://your-app.com/api/health`
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: Add your email

#### Step 3: Configure Alerts

1. Go to **My Settings** → **Alert Contacts**
2. Add contacts:
   - Email
   - Slack
   - SMS (paid)
   - Webhook

### Pingdom Setup

#### Step 1: Create Account

1. Sign up at [pingdom.com](https://pingdom.com)
2. Choose a plan

#### Step 2: Add Uptime Check

1. Go to **Uptime** → **Add New**
2. Configure:
   - **Name**: DTT Framework Production
   - **URL**: `https://your-app.com/api/health`
   - **Check Interval**: 1 minute
   - **Alerts**: Configure alert contacts

### Status Page Setup

Create a public status page:

```typescript
// src/app/status/page.tsx
export default async function StatusPage() {
  const health = await fetch('https://your-app.com/api/health').then(r => r.json())

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">System Status</h1>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Overall: {health.status}</span>
        </div>
        {Object.entries(health.services).map(([service, status]: [string, any]) => (
          <div key={service} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{service}: {status.status} ({status.responseTime}ms)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Synthetic Monitoring

Set up synthetic monitoring to test user flows:

```typescript
// Example: Test authentication flow
async function testAuthentication() {
  const startTime = Date.now()

  try {
    // 1. Navigate to sign-in page
    const signInPage = await fetch('https://your-app.com/sign-in')
    if (!signInPage.ok) throw new Error('Sign-in page failed')

    // 2. Submit credentials
    const response = await fetch('https://your-app.com/api/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    })

    if (!response.ok) throw new Error('Authentication failed')

    const duration = Date.now() - startTime
    return { status: 'ok', duration }
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
```

---

## Log Management

### Vercel Logs

#### Access Logs

```bash
# View recent logs
vercel logs

# View logs for specific deployment
vercel logs <deployment-url>

# Follow logs in real-time
vercel logs --follow

# Filter logs
vercel logs --filter="error"
```

#### Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| **Error** | Error conditions | Critical issues |
| **Warn** | Warning conditions | Potential issues |
| **Info** | Informational messages | General information |
| **Debug** | Debugging messages | Development |

### DigitalOcean Droplet Logs

#### Application Logs (PM2)

```bash
# View PM2 logs
pm2 logs

# View specific application logs
pm2 logs dtt-framework

# View error logs only
pm2 logs dtt-framework --err

# Clear logs
pm2 flush
```

#### Nginx Logs

```bash
# View access logs
tail -f /var/log/nginx/access.log

# View error logs
tail -f /var/log/nginx/error.log

# Search for specific patterns
grep "error" /var/log/nginx/error.log
```

#### System Logs

```bash
# View system logs
journalctl -f

# View specific service logs
journalctl -u nginx -f

# View logs from last hour
journalctl --since "1 hour ago"
```

### Log Aggregation

#### Logtail

```bash
# Install Logtail
curl -sSL https://logs.betterstack.com/install.sh | bash

# Configure
logtail install --source dtt-framework

# View logs
logtail tail
```

#### Papertrail

```bash
# Install remote_syslog2
wget https://github.com/papertrail/remote_syslog2/releases/download/v0.20/remote_syslog_linux_amd64.tar.gz

# Configure
cat > /etc/log_files.yml <<EOF
files:
  - /var/log/nginx/access.log
  - /var/log/nginx/error.log
destination:
  host: logsXX.papertrailapp.com
  port: XXXXX
  protocol: tls
EOF

# Start service
remote_syslog
```

---

## Alerting

### Alert Configuration

#### Critical Alerts

| Condition | Threshold | Action |
|-----------|-----------|--------|
| **Application Down** | Health check fails 3 times | Page team immediately |
| **Error Rate** | >1% for 5 minutes | Email team |
| **Response Time** | >5s for 5 minutes | Email team |
| **Database Down** | Connection fails 3 times | Page team immediately |

#### Warning Alerts

| Condition | Threshold | Action |
|-----------|-----------|--------|
| **High Error Rate** | >0.5% for 10 minutes | Email team |
| **Slow Response** | >2s for 10 minutes | Email team |
| **High Memory** | >80% for 15 minutes | Email team |
| **High CPU** | >80% for 15 minutes | Email team |

### Alert Channels

#### Email Alerts

Configure email alerts in your monitoring tool.

#### Slack Alerts

Create Slack webhook:

```bash
# Create Slack app
# https://api.slack.com/apps

# Add Incoming Webhook
# Copy webhook URL

# Add to monitoring tool
```

#### PagerDuty Integration

```bash
# Create PagerDuty service
# Add integration
# Copy integration key

# Add to monitoring tool
```

### Alert Escalation Policy

```
Level 1: Email team (5 minutes)
    ↓
Level 2: Slack channel (10 minutes)
    ↓
Level 3: SMS/Call (15 minutes)
    ↓
Level 4: Manager notification (30 minutes)
```

---

## Monitoring Dashboard

### Creating a Dashboard

Use tools like:
- **Grafana**: Open-source dashboard
- **Datadog**: SaaS dashboard
- **New Relic**: SaaS dashboard
- **Vercel Dashboard**: Built-in

### Dashboard Metrics

Include these metrics on your dashboard:

| Category | Metrics |
|----------|---------|
| **Application** | Request rate, error rate, response time |
| **Infrastructure** | CPU, memory, disk usage |
| **Database** | Query time, connection pool, slow queries |
| **External Services** | API latency, success rate |
| **Business** | Active users, sign-ups, conversions |

---

## Monitoring Best Practices

### 1. Monitor Everything

- Application metrics
- Infrastructure metrics
- Business metrics
- User experience metrics

### 2. Set Meaningful Alerts

- Alert on actionable issues
- Avoid alert fatigue
- Use severity levels
- Configure escalation

### 3. Review Regularly

- Daily: Check error rates
- Weekly: Review performance trends
- Monthly: Optimize based on data

### 4. Document Incidents

- Document every incident
- Track root causes
- Share learnings
- Improve processes

### 5. Continuous Improvement

- Adjust thresholds based on data
- Add new metrics as needed
- Remove unused alerts
- Update dashboards regularly

---

## Troubleshooting

### Issue: Health Check Failing

**Symptoms:**
- Health check returns error
- Monitoring shows service down

**Solutions:**

```bash
# Check health endpoint manually
curl https://your-app.com/api/health

# Check application logs
vercel logs

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Restart application
pm2 restart dtt-framework
```

### Issue: High Error Rate

**Symptoms:**
- Error rate spike
- Many user complaints

**Solutions:**

```bash
# Check error logs
vercel logs --filter="error"

# Check Sentry for recent errors
# Go to Sentry dashboard

# Identify common errors
# Look for patterns

# Fix critical errors first
# Deploy hotfix if needed
```

### Issue: Slow Response Times

**Symptoms:**
- Pages loading slowly
- API responses slow

**Solutions:**

```bash
# Check response times
curl -w "@curl-format.txt" https://your-app.com

# Check database queries
# Review slow query logs

# Check CDN caching
# Verify cache headers

# Optimize images
# Use next/image
```

---

## Related Documentation

- [Vercel Deployment](./vercel.md) - Vercel deployment guide
- [DigitalOcean Deployment](./digitalocean.md) - DigitalOcean deployment guide
- [Environment Variables](./environment-variables.md) - Complete variable reference
- [CI/CD Setup](./ci-cd.md) - Automated deployments
- [Production Checklist](./production-checklist.md) - Pre-deployment checklist
- [Domain Setup](./domain-setup.md) - Custom domain configuration
- [Health Check System](../health-check-system.md) - Built-in health check features
