# Client Updater Version 2 - CI/CD Setup Guide

## Overview

This guide provides comprehensive instructions for setting up Continuous Integration and Continuous Deployment (CI/CD) for the Client Updater Version 2 using GitHub Actions. It covers automated testing, deployment, preview deployments, and branch protection rules.

---

## Table of Contents

1. [GitHub Actions Setup](#github-actions-setup)
2. [Automated Testing](#automated-testing)
3. [Automated Deployment](#automated-deployment)
4. [Preview Deployments](#preview-deployments)
5. [Branch Protection Rules](#branch-protection-rules)
6. [Advanced CI/CD Patterns](#advanced-cicd-patterns)

---

## GitHub Actions Setup

### Prerequisites

Before setting up CI/CD, ensure you have:

- **GitHub Repository**: Your code should be hosted on GitHub
- **Vercel Account**: For Vercel deployments
- **Vercel Token**: For authentication
- **Environment Variables**: Configured in GitHub Secrets

### Step 1: Create GitHub Workflows Directory

```bash
# Create workflows directory
mkdir -p .github/workflows
```

### Step 2: Get Vercel Credentials

#### Get Vercel Token

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Get your token
vercel token create
# Copy the token and save it
```

#### Get Project IDs

```bash
# Link your project
vercel link

# Get project ID
cat .vercel/project.json
# Copy the "projectId" and "orgId"
```

### Step 3: Configure GitHub Secrets

1. Go to **Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VERCEL_TOKEN` | Vercel authentication token | `xxx` |
| `VERCEL_ORG_ID` | Vercel organization ID | `team_xxx` |
| `VERCEL_PROJECT_ID` | Vercel project ID | `prj_xxx` |
| `DATABASE_URL` | Database connection string | `postgresql://...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_live_xxx` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_live_xxx` |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret | `whsec_xxx` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJxxx` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJxxx` |

---

## Automated Testing

### Step 1: Create Test Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linting
        run: pnpm lint

      - name: Run type checking
        run: pnpm type-check

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

### Step 2: Configure Test Scripts

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:watch": "vitest"
  }
}
```

### Step 3: Test Workflow Features

| Feature | Description |
|---------|-------------|
| **Triggered on push** | Runs on every push to main/develop |
| **Triggered on PR** | Runs on every pull request |
| **Linting** | Checks code style |
| **Type checking** | Verifies TypeScript types |
| **Unit tests** | Runs unit tests |
| **Integration tests** | Runs integration tests |
| **Coverage upload** | Uploads coverage to Codecov |

---

## Automated Deployment

### Step 1: Create Production Deployment Workflow

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Build application
        run: pnpm build
        env:
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./

      - name: Run database migrations
        run: pnpm db:push
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Notify deployment status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Step 2: Create Staging Deployment Workflow

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.STAGING_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.STAGING_CLERK_SECRET_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY }}

      - name: Build application
        run: pnpm build
        env:
          NEXT_PUBLIC_APP_URL: ${{ secrets.STAGING_APP_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.STAGING_CLERK_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}

      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--scope=your-team'
          working-directory: ./

      - name: Run database migrations
        run: pnpm db:push
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      - name: Run smoke tests
        run: pnpm test:smoke
        env:
          STAGING_URL: ${{ secrets.STAGING_APP_URL }}
```

### Step 3: Deployment Workflow Features

| Feature | Production | Staging |
|---------|------------|---------|
| **Trigger** | Push to main | Push to develop |
| **Manual trigger** | Yes | Yes |
| **Run tests** | Yes | Yes |
| **Build** | Yes | Yes |
| **Deploy** | Vercel --prod | Vercel preview |
| **Migrations** | Yes | Yes |
| **Smoke tests** | Optional | Yes |
| **Notifications** | Yes | Optional |

---

## Preview Deployments

### Step 1: Create Preview Deployment Workflow

Create `.github/workflows/deploy-preview.yml`:

```yaml
name: Deploy Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Build application
        run: pnpm build
        env:
          NEXT_PUBLIC_APP_URL: https://preview-${{ github.event.number }}.your-app.com
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Deploy to Vercel Preview
        id: vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--scope=your-team'
          working-directory: ./

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployment ready!\n\nURL: ${{ steps.vercel.outputs.preview-url }}`
            })
```

### Step 2: Configure Preview Deployments in Vercel

1. Go to **Settings** → **Git**
2. Enable **"Preview Deployments"**
3. Configure preview branch settings:
   - **Branch**: `*` (all branches)
   - **Environment**: Preview
   - **Automatic**: Yes

### Step 3: Preview Deployment Features

| Feature | Description |
|---------|-------------|
| **Auto-created** | Created for every PR |
| **Unique URL** | Each PR gets unique URL |
| **Auto-comment** | URL posted to PR |
| **Auto-deleted** | Deleted when PR closes |
| **Environment** | Uses preview environment variables |

---

## Branch Protection Rules

### Step 1: Configure Branch Protection

1. Go to **Repository** → **Settings** → **Branches**
2. Click **"Add rule"**
3. Enter branch name pattern: `main`
4. Configure protection rules:

### Required Branch Protection Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Require pull request** | ✅ Yes | Require PR before merging |
| **Require approvals** | ✅ Yes | Minimum 1 approval |
| **Dismiss stale approvals** | ✅ Yes | Re-approve on new commits |
| **Require status checks** | ✅ Yes | Require CI to pass |
| **Require branches to be up to date** | ✅ Yes | Must be up to date with main |
| **Do not allow bypassing** | ✅ Yes | Enforce rules for all users |
| **Require signed commits** | Optional | Require GPG signatures |
| **Include administrators** | ✅ Yes | Apply rules to admins |
| **Allow force pushes** | ❌ No | Prevent force pushes |
| **Allow deletions** | ❌ No | Prevent branch deletion |

### Step 2: Configure Required Status Checks

Add the following required checks:

| Check Name | Description |
|-------------|-------------|
| `Test` | Unit and integration tests |
| `Lint` | Code linting |
| `Type Check` | TypeScript type checking |
| `Build` | Application build |

### Step 3: Configure Branch Protection via API

Use GitHub CLI to configure branch protection:

```bash
# Install GitHub CLI
# https://cli.github.com/

# Authenticate
gh auth login

# Configure branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{
    "strict": true,
    "contexts": ["Test", "Lint", "Type Check", "Build"]
  }' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  }' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

### Step 4: Branch Protection Best Practices

| Practice | Description |
|-----------|-------------|
| **Require PRs** | All changes go through PRs |
| **Require approvals** | At least one review required |
| **Require CI** | All checks must pass |
| **Keep up to date** | PRs must be up to date |
| **No force pushes** | Prevent history rewrites |
| **No deletions** | Prevent accidental deletion |

---

## Advanced CI/CD Patterns

### Pattern 1: Monorepo Support

For monorepo setups using Turborepo:

```yaml
name: Monorepo CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
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

      - name: Install Turborepo
        run: pnpm add -g turbo

      - name: Install dependencies
        run: pnpm install

      - name: Run affected tests
        run: turbo test --filter=[HEAD~1]

      - name: Run affected builds
        run: turbo build --filter=[HEAD~1]
```

### Pattern 2: Multi-Environment Deployment

Deploy to multiple environments:

```yaml
name: Multi-Environment Deploy

on:
  push:
    branches: [main, develop, staging]

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

      - name: Build
        run: pnpm build

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/staging'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Development
        if: github.ref == 'refs/heads/develop'
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Pattern 3: Database Migration Workflow

Separate workflow for database migrations:

```yaml
name: Database Migrations

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging
          - development

jobs:
  migrate:
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

      - name: Run migrations
        run: pnpm db:push
        env:
          DATABASE_URL: ${{ secrets[format('{0}_DATABASE_URL', github.event.inputs.environment)] }}
```

### Pattern 4: Rollback Workflow

Automated rollback workflow:

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      commit_sha:
        description: 'Commit SHA to rollback to'
        required: true
      environment:
        description: 'Environment to rollback'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - staging

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.commit_sha }}

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

      - name: Build
        run: pnpm build

      - name: Deploy rollback
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: 'success'
          text: 'Rollback to ${{ github.event.inputs.commit_sha }} completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Pattern 5: Scheduled Maintenance Workflow

Scheduled health checks and maintenance:

```yaml
name: Scheduled Maintenance

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check production health
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://your-app.com/api/health)
          if [ $response -ne 200 ]; then
            echo "Health check failed!"
            exit 1
          fi

      - name: Check database connection
        run: |
          psql ${{ secrets.DATABASE_URL }} -c "SELECT 1"

      - name: Run database backups
        run: |
          pg_dump ${{ secrets.DATABASE_URL }} > backup_$(date +%Y%m%d).sql

      - name: Notify maintenance status
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Scheduled maintenance ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## CI/CD Best Practices

### 1. Use Caching

Cache dependencies to speed up builds:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'
```

### 2. Parallel Jobs

Run tests in parallel:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

### 3. Conditional Deployments

Only deploy on specific conditions:

```yaml
- name: Deploy
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  uses: amondnet/vercel-action@v25
```

### 4. Artifact Upload

Upload build artifacts:

```yaml
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build
    path: .next/
```

### 5. Notification Integration

Integrate with Slack, Discord, etc.:

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Troubleshooting

### Issue: Workflow Fails on Environment Variables

**Symptoms:**
- Workflow fails during build
- Environment variable errors

**Solutions:**

```bash
# Verify secrets are set
gh secret list

# Check secret names match exactly
# Case-sensitive names

# Verify secrets are accessible
# Check repository permissions
```

### Issue: Deployment Fails Due to Tests

**Symptoms:**
- Tests fail in CI but pass locally
- Flaky tests

**Solutions:**

```yaml
# Add retry logic
- name: Run tests
  run: pnpm test
  continue-on-error: false

# Use test retries
# Configure in vitest.config.ts
```

### Issue: Preview Deployments Not Created

**Symptoms:**
- PRs don't create preview deployments
- No preview URL in PR comments

**Solutions:**

```bash
# Check Vercel Git integration
# Settings → Git → Preview Deployments

# Verify Vercel credentials
# Check VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

# Check workflow permissions
# Repository → Settings → Actions → General → Workflow permissions
```

---

## Related Documentation

- [Vercel Deployment](./vercel.md) - Vercel deployment guide
- [DigitalOcean Deployment](./digitalocean.md) - DigitalOcean deployment guide
- [Environment Variables](./environment-variables.md) - Complete variable reference
- [Production Checklist](./production-checklist.md) - Pre-deployment checklist
- [Monitoring](./monitoring.md) - Monitoring and alerting setup
- [Testing Guide](../testing-guide.md) - Testing patterns and practices
