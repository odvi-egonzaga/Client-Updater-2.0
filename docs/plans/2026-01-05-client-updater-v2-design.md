# Client Updater v2 - Design Document

**Date:** 2026-01-05
**Status:** Approved
**Author:** AI-assisted design session

---

## 1. Overview

### 1.1 Purpose

Migrate the legacy Client Updater (backend-cu + frontend-cu) to a new, fully documented version that AI can easily understand and work with. The new version will have comprehensive documentation enabling AI assistants to quickly grasp business logic and contribute effectively.

### 1.2 Goals

1. **Full parity migration** — Replicate all existing functionality for both FCASH and PCNI
2. **AI-readable documentation** — Separate docs folder + README-driven module documentation
3. **Modern stack** — Build on existing v2 framework (Next.js 15 + Supabase)
4. **Flexible configuration** — Admin-configurable options without code changes
5. **Permission-based auth** — Granular permissions instead of fixed roles

### 1.3 Architecture Summary

```
┌─────────────┐     ┌──────────────────────┐     ┌────────────┐
│  Snowflake  │────▶│  Supabase Functions  │◀────│  NextBank  │
│  (Source)   │     │  (Business Logic)    │     │  (Source)  │
└─────────────┘     └──────────┬───────────┘     └────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Supabase PostgreSQL │
                    │  (Application DB)    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Next.js Frontend    │
                    │  (Vercel)            │
                    └──────────────────────┘
```

**Deployment:**
- Next.js frontend → Vercel
- Backend logic (Supabase Edge Functions) → Supabase
- Database → Supabase PostgreSQL
- File exports → Queue system with Supabase Storage

---

## 2. Database Schema

### 2.1 Lookup Tables

All lookup tables include these admin-editable columns:
- `is_system` (boolean) — Core system option, cannot delete
- `is_active` (boolean) — Hidden from dropdowns when false
- `sort_order` (integer) — Controls display order
- `created_by` (user_id) — Admin who created (null = seeded)
- `created_at`, `updated_at` (timestamps)

#### companies
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | FCASH, PCNI |
| name | varchar | Display name |

#### pension_types
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | SSS, GSIS, PVAO, NON_PNP, PNP |
| name | varchar | Display name |
| company_id | uuid | FK to companies |

#### pensioner_types
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | DEPENDENT, DISABILITY, RETIREE, ITF |
| name | varchar | Display name |
| pension_type_id | uuid | FK to pension_types |

#### products
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Product code |
| name | varchar | Display name |
| company_id | uuid | FK to companies |
| tracking_cycle | enum | 'monthly' or 'quarterly' |

#### account_types
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | PASSBOOK, ATM, BOTH, NONE |
| name | varchar | Display name |

#### par_statuses
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | tele_130, do_not_show, tele_hardcore |
| name | varchar | Display name |
| is_trackable | boolean | Whether clients are included in tracking |

#### status_types
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | PENDING, TO_FOLLOW, CALLED, VISITED, UPDATED, DONE |
| name | varchar | Display name |
| sequence | integer | Order in workflow |
| company_id | uuid | FK to companies (null = all companies) |

#### status_reasons
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Reason code |
| name | varchar | Display name |
| status_type_id | uuid | FK to status_types |
| is_terminal | boolean | Excludes from future periods (Deceased, Fully-Paid) |
| requires_remarks | boolean | Force remarks input |

### 2.2 Organization

#### areas
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Area code |
| name | varchar | Display name |
| company_id | uuid | FK to companies |
| deleted_at | timestamp | Soft delete |

#### branches
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Branch code (e.g., MNLA01) |
| name | varchar | Display name |
| location | varchar | Address |
| category | varchar | Branch category |
| deleted_at | timestamp | Soft delete |

#### area_branches
| Column | Type | Description |
|--------|------|-------------|
| area_id | uuid | FK to areas |
| branch_id | uuid | FK to branches |
| is_primary | boolean | Primary area for branch |

#### branch_contacts
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| branch_id | uuid | FK to branches |
| type | varchar | Contact type (phone, email, etc.) |
| value | varchar | Contact value |
| is_primary | boolean | Primary contact |

### 2.3 Users & Permissions

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| clerk_id | varchar | Clerk user ID |
| email | varchar | Email address |
| first_name | varchar | First name |
| last_name | varchar | Last name |
| is_active | boolean | Can access system |
| deleted_at | timestamp | Soft delete |
| created_at | timestamp | Created timestamp |
| updated_at | timestamp | Updated timestamp |

#### permissions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Full permission code (e.g., clients:read) |
| resource | varchar | Resource name (clients, reports, users) |
| action | varchar | Action (read, update, delete, manage) |
| description | varchar | Human-readable description |

**Default Permissions:**
- `clients:read`, `clients:update`
- `status:read`, `status:update`
- `reports:read`, `reports:export`
- `users:read`, `users:manage`
- `branches:read`, `branches:manage`
- `areas:read`, `areas:manage`
- `config:read`, `config:manage`
- `sync:read`, `sync:execute`

#### user_permissions
| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to users |
| permission_id | uuid | FK to permissions |
| company_id | uuid | FK to companies (permission scoped to company) |

#### user_branches
| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to users |
| branch_id | uuid | FK to branches |
| granted_at | timestamp | When access was granted |

#### user_areas
| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to users |
| area_id | uuid | FK to areas |
| granted_at | timestamp | When access was granted (grants all branches in area) |

### 2.4 Clients

#### clients
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_code | varchar | Business identifier (unique) |
| full_name | varchar | Client full name |
| pension_number | varchar | Pension number |
| birth_date | date | Date of birth |
| contact_number | varchar | Primary contact |
| contact_number_alt | varchar | Alternative contact |
| pension_type_id | uuid | FK to pension_types |
| pensioner_type_id | uuid | FK to pensioner_types |
| product_id | uuid | FK to products |
| branch_id | uuid | FK to branches |
| par_status_id | uuid | FK to par_statuses |
| account_type_id | uuid | FK to account_types |
| past_due_amount | decimal | Outstanding balance |
| loan_status | varchar | Current loan status |
| is_active | boolean | Active client |
| last_synced_at | timestamp | Last sync from source |
| sync_source | varchar | 'snowflake' or 'nextbank' |
| created_at | timestamp | Record created |
| updated_at | timestamp | Record updated |
| deleted_at | timestamp | Soft delete |

#### client_sync_history
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| field_changed | varchar | Which field changed |
| old_value | text | Previous value |
| new_value | text | New value |
| sync_job_id | uuid | FK to sync_jobs |
| changed_at | timestamp | When change occurred |

### 2.5 Status Tracking

#### client_period_status (Current Snapshot)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| period_type | enum | 'monthly' or 'quarterly' |
| period_month | integer | 1-12 (null if quarterly) |
| period_quarter | integer | 1-4 (null if monthly) |
| period_year | integer | Year |
| status_type_id | uuid | FK to status_types |
| reason_id | uuid | FK to status_reasons |
| remarks | text | Additional notes |
| has_payment | boolean | Payment received this period |
| update_count | integer | Number of status changes |
| is_terminal | boolean | Excluded from future periods |
| updated_by | uuid | FK to users |
| updated_at | timestamp | Last update |
| created_at | timestamp | Record created |

**Unique Constraint:** `(client_id, period_type, period_month, period_quarter, period_year)`

#### status_events (Audit Trail)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_period_status_id | uuid | FK to client_period_status |
| status_type_id | uuid | FK to status_types |
| reason_id | uuid | FK to status_reasons |
| remarks | text | Notes at time of change |
| has_payment | boolean | Payment status at time of change |
| event_sequence | integer | Order of events (1, 2, 3...) |
| created_by | uuid | FK to users |
| created_at | timestamp | When event occurred |

### 2.6 Admin Configuration

#### config_categories
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Category code (remarks_templates, call_outcomes) |
| name | varchar | Display name |
| description | text | Category description |
| is_active | boolean | Category is active |
| sort_order | integer | Display order |
| created_at | timestamp | Created timestamp |

#### config_options
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| category_id | uuid | FK to config_categories |
| code | varchar | Option code |
| label | varchar | Display label |
| value | text | Option value |
| metadata | jsonb | Additional attributes |
| is_active | boolean | Option is active |
| is_default | boolean | Default selection |
| sort_order | integer | Display order |
| parent_option_id | uuid | FK to self (for sub-options) |
| company_id | uuid | FK to companies (null = all) |
| created_by | uuid | FK to users |
| created_at | timestamp | Created timestamp |
| updated_at | timestamp | Updated timestamp |

#### config_settings
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | varchar | Setting key |
| value | text | Setting value |
| value_type | enum | 'string', 'number', 'boolean', 'json' |
| description | text | Setting description |
| is_public | boolean | Exposed to frontend |
| company_id | uuid | FK to companies (null = global) |
| updated_by | uuid | FK to users |
| updated_at | timestamp | Last update |

#### config_audit_log
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| table_name | varchar | Which config table |
| record_id | uuid | Record that changed |
| action | varchar | create, update, delete |
| old_values | jsonb | Previous values |
| new_values | jsonb | New values |
| changed_by | uuid | FK to users |
| changed_at | timestamp | When change occurred |
| ip_address | varchar | Request IP |

### 2.7 Jobs & Background Tasks

#### sync_jobs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | varchar | 'snowflake' or 'nextbank' |
| status | enum | 'pending', 'running', 'completed', 'failed' |
| parameters | jsonb | Job parameters |
| records_processed | integer | Total records processed |
| records_created | integer | New records created |
| records_updated | integer | Existing records updated |
| started_at | timestamp | Job start time |
| completed_at | timestamp | Job completion time |
| error | text | Error message if failed |
| created_by | uuid | FK to users |
| created_at | timestamp | Job created |

#### export_jobs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | varchar | 'clients', 'status', 'report' |
| format | varchar | 'csv', 'xlsx' |
| status | enum | 'pending', 'processing', 'completed', 'failed' |
| parameters | jsonb | Export parameters (filters, columns) |
| file_path | varchar | Storage path when complete |
| file_size | integer | File size in bytes |
| started_at | timestamp | Processing start time |
| completed_at | timestamp | Processing completion time |
| error | text | Error message if failed |
| expires_at | timestamp | When file will be deleted |
| created_by | uuid | FK to users |
| created_at | timestamp | Job created |

### 2.8 Key Indexes

```sql
-- Client queries (most frequent)
CREATE INDEX idx_clients_branch ON clients(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_pension_type ON clients(pension_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_par_status ON clients(par_status_id) WHERE is_active = true;
CREATE INDEX idx_clients_client_code ON clients(client_code);

-- Status period queries
CREATE INDEX idx_period_status_client ON client_period_status(client_id);
CREATE INDEX idx_period_status_period ON client_period_status(period_year, period_month, period_quarter);
CREATE INDEX idx_period_status_lookup ON client_period_status(period_year, period_type, status_type_id);

-- User territory access
CREATE INDEX idx_user_branches_user ON user_branches(user_id);
CREATE INDEX idx_user_areas_user ON user_areas(user_id);
CREATE INDEX idx_area_branches_area ON area_branches(area_id);
```

---

## 3. Supabase Edge Functions Structure

```
supabase/functions/
├── _shared/                        # Shared code
│   ├── README.md
│   ├── db/
│   │   ├── client.ts               # Drizzle DB client
│   │   ├── schema/                 # Drizzle schema definitions
│   │   └── queries/                # Reusable query builders
│   ├── auth/
│   │   ├── clerk.ts                # Clerk JWT verification
│   │   └── permissions.ts          # Permission checking
│   ├── types/
│   ├── utils/
│   │   ├── response.ts             # Standardized API responses
│   │   ├── validation.ts           # Zod schemas
│   │   ├── pagination.ts
│   │   └── errors.ts
│   └── integrations/
│       ├── snowflake.ts
│       ├── nextbank.ts
│       └── storage.ts
│
├── clients/                        # Client management
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── list.ts
│   │   ├── get.ts
│   │   ├── update-contact.ts
│   │   └── bulk-status.ts
│   └── services/
│       ├── client.service.ts
│       └── filter.service.ts
│
├── status/                         # Status tracking
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── update.ts
│   │   ├── bulk-update.ts
│   │   ├── history.ts
│   │   └── summary.ts
│   └── services/
│       ├── status.service.ts
│       └── validation.service.ts
│
├── sync/                           # Data synchronization
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── snowflake.ts
│   │   ├── nextbank.ts
│   │   └── status.ts
│   └── services/
│       ├── snowflake-sync.service.ts
│       ├── nextbank-sync.service.ts
│       └── reconciliation.service.ts
│
├── reports/                        # Export & reporting
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── request-export.ts
│   │   ├── download.ts
│   │   └── job-status.ts
│   └── services/
│       ├── export.service.ts
│       └── templates/
│
├── admin/                          # Admin configuration
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── config-options.ts
│   │   ├── config-settings.ts
│   │   ├── lookups.ts
│   │   └── audit-log.ts
│   └── services/
│       └── config.service.ts
│
├── users/                          # User management
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── list.ts
│   │   ├── permissions.ts
│   │   ├── territories.ts
│   │   └── webhook.ts
│   └── services/
│       └── user.service.ts
│
├── organization/                   # Branches & Areas
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── branches.ts
│   │   ├── areas.ts
│   │   └── assignments.ts
│   └── services/
│       └── organization.service.ts
│
└── queue/                          # Background jobs
    ├── README.md
    ├── index.ts
    ├── handlers/
    │   ├── process-export.ts
    │   ├── process-sync.ts
    │   └── cleanup.ts
    └── services/
        └── queue.service.ts
```

### 3.1 API Response Standards

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 150,
    "totalPages": 6
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid status transition",
    "details": { "field": "status", "reason": "Cannot go from DONE to PENDING" }
  }
}
```

---

## 4. Frontend Architecture (Next.js)

```
src/
├── app/
│   ├── (auth)/                     # Public auth pages
│   │   ├── sign-in/[[...sign-in]]/
│   │   └── sign-up/[[...sign-up]]/
│   │
│   ├── (dashboard)/                # Protected pages
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Dashboard home
│   │   ├── clients/
│   │   │   ├── README.md
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── _components/
│   │   ├── fcash/
│   │   │   ├── README.md
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   ├── pcni/
│   │   │   ├── README.md
│   │   │   ├── page.tsx
│   │   │   ├── non-pnp/page.tsx
│   │   │   ├── pnp/page.tsx
│   │   │   └── _components/
│   │   ├── reports/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── branches/
│   │   │   ├── areas/
│   │   │   ├── config/
│   │   │   └── sync/
│   │   └── settings/
│   │
│   └── api/webhooks/clerk/route.ts
│
├── components/
│   ├── ui/                         # Shadcn/ui primitives
│   ├── layouts/
│   └── shared/
│       ├── permission-gate.tsx
│       ├── period-selector.tsx
│       ├── branch-selector.tsx
│       └── status-badge.tsx
│
├── features/
│   ├── auth/
│   │   ├── README.md
│   │   └── hooks/use-permissions.ts
│   ├── clients/
│   │   ├── README.md
│   │   └── hooks/
│   ├── status/
│   │   ├── README.md
│   │   └── hooks/
│   └── exports/
│       ├── README.md
│       └── hooks/
│
├── hooks/
├── lib/
│   └── supabase/
│       ├── client.ts
│       └── functions.ts
├── stores/
│   ├── ui-store.ts
│   ├── filter-store.ts
│   └── period-store.ts
└── types/
```

---

## 5. Documentation Structure

```
docs/
├── README.md                       # Documentation index
│
├── business-logic/
│   ├── README.md
│   ├── 01-domain-overview.md
│   ├── 02-client-lifecycle.md
│   ├── 03-status-workflow.md
│   ├── 04-fcash-vs-pcni.md
│   ├── 05-territory-management.md
│   ├── 06-permission-model.md
│   ├── 07-sync-process.md
│   └── glossary.md
│
├── architecture/
│   ├── README.md
│   ├── 01-system-overview.md
│   ├── 02-database-schema.md
│   ├── 03-data-flow.md
│   ├── 04-auth-and-permissions.md
│   ├── 05-edge-functions.md
│   ├── 06-queue-system.md
│   └── decisions/
│
├── api/
│   ├── README.md
│   ├── authentication.md
│   ├── error-codes.md
│   ├── clients.md
│   ├── status.md
│   ├── sync.md
│   ├── reports.md
│   ├── admin.md
│   ├── users.md
│   └── organization.md
│
├── workflows/
│   ├── README.md
│   ├── 01-daily-status-updates.md
│   ├── 02-monthly-fcash-cycle.md
│   ├── 03-quarterly-pcni-cycle.md
│   ├── 04-data-sync-process.md
│   ├── 05-generating-reports.md
│   ├── 06-admin-configuration.md
│   └── 07-user-onboarding.md
│
├── development/
│   ├── README.md
│   ├── getting-started.md
│   ├── environment-variables.md
│   ├── database-migrations.md
│   ├── adding-new-function.md
│   ├── testing-guide.md
│   └── deployment.md
│
└── ai-context/
    ├── README.md
    ├── quick-reference.md
    ├── common-tasks.md
    └── gotchas.md
```

---

## 6. Business Logic Summary

### 6.1 Two Business Segments

| Segment | Company | Tracking Cycle | Available Statuses |
|---------|---------|----------------|-------------------|
| FCASH | FCASH | Monthly | PENDING → TO_FOLLOW → CALLED → VISITED → UPDATED → DONE |
| PCNI Non-PNP | PCNI | Monthly | PENDING → TO_FOLLOW → CALLED → UPDATED → DONE |
| PCNI PNP | PCNI | Quarterly | PENDING → TO_FOLLOW → CALLED → UPDATED → DONE |

### 6.2 Status Workflow

```
PENDING (Initial state)
    ↓
TO_FOLLOW (Scheduled for contact)
    ↓
CALLED (Phone contact made)
    ↓
VISITED (Physical visit - FCASH only)
    ↓
UPDATED (Information confirmed)
    ↓
DONE (Process complete)
```

### 6.3 Terminal Statuses

Clients marked with terminal reasons are excluded from future periods:
- **Deceased** — Client is deceased
- **Fully-Paid** — Loan fully paid

### 6.4 Territory-Based Access

```
User
  ├── user_branches → Direct branch access
  └── user_areas → area_branches → All branches in area
```

Users only see clients belonging to their accessible branches.

### 6.5 Data Sync Flow

```
1. Snowflake (primary source)
   └── Contains: Client master data, PAR status, loan info

2. NextBank (secondary source)
   └── Contains: Payment history, update history

3. PostgreSQL (application database)
   └── Stores: Synced clients, status updates, configuration
```

---

## 7. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tech Stack | Next.js 15 + Supabase | Existing v2 framework, modern stack |
| Deployment | Vercel + Supabase | Frontend/backend separation, edge functions |
| Auth | Clerk + custom permissions | Industry-standard auth with flexible permissions |
| Database | Supabase PostgreSQL | Integrated with edge functions |
| Schema | Normalized with event sourcing | Audit trail, flexible queries |
| Config | Admin-editable lookups | No code changes for new options |
| Exports | Queue-based | Async processing for large files |
| Docs | Folder + README per module | AI-readable, discoverable |

---

## 8. Implementation Phases (Revised)

> **Planning Status:**
> - ✅ = Plan written in `docs/plans/`
> - 🔲 = Not yet planned

### Phase 0: Infrastructure Setup ✅
> See `2026-01-05-phase-0-1-implementation.md` (Tasks 1-8)

- [x] Upstash Redis packages and cache service
- [x] Environment variables for infrastructure
- [x] Rate limiting middleware
- [x] Circuit breaker for external services
- [x] Logger service
- [x] API middleware stack (tracing, error handling)
- [x] Health check endpoint

### Phase 1: Database Foundation ✅
> See `2026-01-05-phase-0-1-implementation.md` (Tasks 9-15)

- [x] Lookup tables schema (pension_types, products, status_types, etc.)
- [x] Organization schema (areas, branches, area_branches)
- [x] Users schema with permissions (users, permissions, user_permissions)
- [x] Clients schema
- [x] Jobs/config schema (sync_jobs, export_jobs, config_*)
- [x] Database migrations
- [x] Seed scripts for lookup data

### Phase 2: User Management ✅
> See `2026-01-05-phase-2-user-management.md`

- [x] User CRUD queries with Drizzle
- [x] Enhanced Clerk webhook (login tracking, soft delete)
- [x] Permission assignment APIs
- [x] Territory assignment APIs (branches/areas)
- [x] Session management APIs
- [x] Permission caching service
- [x] User list/detail UI

### Phase 3: Client Management ✅
> See `2026-01-05-phase-3-client-management.md`

- [x] Client queries with pagination, filters, search
- [x] Snowflake sync service with batch processing
- [x] Territory filter service (user branch access)
- [x] Client list/detail/search APIs
- [x] Sync job API (trigger, monitor)
- [x] Client list/detail UI
- [x] Sync status UI

### Phase 4: Status Tracking ✅
> See `2026-01-05-phase-4-status-tracking.md`
> Core status update system - **unified for FCASH and PCNI**

Both business segments use the same `client_period_status` table with:
- `company_id` filter (FCASH vs PCNI)
- `period_type` (monthly vs quarterly)
- Company-specific workflow rules (FCASH includes VISITED status)

**Tasks:**
- [ ] Status queries (get current, get history, update)
- [ ] Status workflow validation service (company-specific rules)
- [ ] Period initialization (create PENDING records for new period)
- [ ] Status update API with validation
- [ ] Status history/audit API
- [ ] Dashboard summary API (counts by status, by pension type)
- [ ] Status update UI components (form, dialog)
- [ ] FCASH dashboard page (`/dashboard/fcash`)
- [ ] PCNI dashboard page (`/dashboard/pcni`)
- [ ] Period selector component

### Phase 5: Organization & Admin ✅
> See `2026-01-05-phase-5-organization-admin.md`
> Branch/Area management and system configuration

**Tasks:**
- [ ] Branch CRUD APIs
- [ ] Area CRUD APIs
- [ ] Area-Branch assignment APIs
- [ ] Config categories/options APIs
- [ ] Config settings APIs
- [ ] Config audit log
- [ ] Branch/Area management UI
- [ ] Config management UI

### Phase 6: Reports & Exports ✅
> See `2026-01-05-phase-6-reports-exports.md`
> Reporting and data export functionality

**Tasks:**
- [ ] Export queue service (async file generation)
- [ ] Export templates (clients, status, reports)
- [ ] Dashboard reports (summary statistics)
- [ ] Export request API
- [ ] Export download API
- [ ] Export history API
- [ ] Reports UI
- [ ] Export progress/download UI

### Phase 7: Polish & Documentation ✅
> See `2026-01-05-phase-7-polish-documentation.md`
> Final cleanup and documentation

**Tasks:**
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Activity log viewer UI
- [ ] Complete docs folder structure
- [ ] Module READMEs
- [ ] AI context documents
- [ ] API documentation

---

## 8.1 Architectural Decisions

### Unified System for FCASH and PCNI

Both business segments share the **same underlying tables** with company-based filtering:

| Aspect | FCASH | PCNI Non-PNP | PCNI PNP |
|--------|-------|--------------|----------|
| Company Filter | `company_id = FCASH` | `company_id = PCNI` | `company_id = PCNI` |
| Period Type | Monthly | Monthly | Quarterly |
| Status Workflow | PENDING → TO_FOLLOW → CALLED → **VISITED** → UPDATED → DONE | PENDING → TO_FOLLOW → CALLED → UPDATED → DONE | Same as Non-PNP |
| Dashboard Path | `/dashboard/fcash` | `/dashboard/pcni` | `/dashboard/pcni?type=pnp` |

The **VISITED** status is only available for FCASH (physical branch visits).

### Why Not Separate Tables?

The original legacy system had separate `fcash_clients` and `clients` tables. The v2 design **unifies** them because:

1. **Same core fields** - Both have client info, branch, pension type, etc.
2. **Simpler queries** - One table with company filter vs joining multiple tables
3. **Easier maintenance** - Changes apply to both segments
4. **Flexible reporting** - Cross-company reports are trivial

The `status_types` table has `company_id` to control which statuses are available per company

---

## 9. Next Steps

1. **Set up database** — Create Drizzle schema and run migrations
2. **Implement _shared** — Auth, DB client, utilities
3. **Build first function** — Start with `/clients` endpoint
4. **Create documentation** — Write as we build

---

## 10. Enhanced Features (Added After Review)

The following enhancements were identified after thorough analysis of the legacy codebase.

### 10.1 FCASH Module

The legacy system has a separate FCASH workflow with its own entities and state machine.

#### fcash_clients
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_code | varchar | Links to main clients table |
| customer_id_nb | varchar | NextBank customer ID |
| customer_id_lms | varchar | LMS customer ID |
| full_name | varchar | Client name |
| normalized_name | varchar | Lowercase, no special chars (for fuzzy search) |
| branch_id | uuid | FK to branches |
| pension_type_id | uuid | FK to pension_types |
| product_id | uuid | FK to products |
| account_type_id | uuid | FK to account_types |
| par_status_id | uuid | FK to par_statuses |
| contact_number | varchar | Primary contact |
| birth_date | date | Date of birth |
| past_due_amount | decimal | Outstanding balance |
| pointer | enum | State: 'current', 'touched_status', 'touched_month' |
| tele_status_id | uuid | FK to tele_statuses |
| update_status_id | uuid | FK to update_statuses |
| month_to_update | date | Synced with NextBank custom field |
| last_synced_at | timestamp | Last sync from NextBank |
| is_active | boolean | Active record |
| created_at | timestamp | Record created |
| updated_at | timestamp | Record updated |

#### fcash_update_history
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| fcash_client_id | uuid | FK to fcash_clients |
| previous_update_id | uuid | FK to self (chains updates) |
| tele_status_id | uuid | FK to tele_statuses |
| update_status_id | uuid | FK to update_statuses |
| reason_id | uuid | FK to status_reasons |
| remarks | text | Agent notes |
| month_to_update | date | Month value at time of update |
| pointer | enum | Pointer state at time of update |
| current_details | jsonb | Client snapshot at update time |
| nextbank_request | jsonb | Request sent to NextBank |
| nextbank_response | jsonb | Response from NextBank |
| user_details | jsonb | User info snapshot |
| created_by | uuid | FK to users |
| created_at | timestamp | When update occurred |

#### Pointer State Machine
```
current (Initial state - no updates yet)
    ↓ [Status Update]
touched_status (Tele status has been set)
    ↓ [Month Update]
touched_month (Month to update has been set)
    ↓ [Next sync resets to current]
current
```

### 10.2 Tele/Update Status System

Separate status workflow for FCASH telemarketing operations.

#### tele_statuses
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | not_yet_contacted, not_yet_updated, updated |
| name | varchar | Display name |
| sort_order | integer | Display order |
| is_system | boolean | Core status |
| is_active | boolean | Can be selected |

#### update_statuses
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Status code |
| name | varchar | Display name |
| tele_status_id | uuid | FK to tele_statuses (parent) |
| requires_reason | boolean | Must select reason |
| requires_remarks | boolean | Must enter remarks |
| sort_order | integer | Display order |
| is_system | boolean | Core status |
| is_active | boolean | Can be selected |

**Update Status by Tele Status:**

| Tele Status | Available Update Statuses | Requires |
|-------------|--------------------------|----------|
| not_yet_contacted | pending, pending_unavailable, pending_not_interested | Nothing |
| not_yet_updated | pending, pending_unavailable | Reason + Remarks |
| updated | updated_with_proof, updated_online_with_proof, updated_no_proof, updated_online_no_proof | Reason + Remarks |

### 10.3 Performance Metrics

Track agent and branch performance over time.

#### performance_snapshots
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | enum | 'tele' or 'branch' |
| entity_id | uuid | FK to users (tele) or branches (branch) |
| company_id | uuid | FK to companies |
| period_month | integer | Month (1-12) |
| period_year | integer | Year |
| total_clients | integer | Total assigned clients |
| clients_contacted | integer | Clients with contact attempt |
| clients_updated | integer | Clients with status update |
| clients_completed | integer | Clients marked DONE |
| conversion_rate | decimal | (completed / total) * 100 |
| metrics | jsonb | Additional metrics (by pension type, etc.) |
| calculated_at | timestamp | When snapshot was taken |
| created_at | timestamp | Record created |

### 10.4 Enhanced User Security

Additional security tracking for users.

#### users (additional columns)
| Column | Type | Description |
|--------|------|-------------|
| must_change_password | boolean | Force password change on next login |
| password_changed_at | timestamp | Last password change |
| last_login_at | timestamp | Last successful login |
| login_count | integer | Total login count |
| failed_login_count | integer | Consecutive failed attempts |
| locked_until | timestamp | Account lock expiry |

#### user_sessions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| session_token | varchar | Unique session identifier |
| ip_address | varchar | Client IP |
| user_agent | text | Browser/device info |
| created_at | timestamp | Session start |
| expires_at | timestamp | Session expiry |
| revoked_at | timestamp | Manual revocation time |
| revoked_reason | varchar | Why session was revoked |

### 10.5 Seeding & Migration System

Track database initialization and data seeding operations.

#### seed_history
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| seed_type | enum | 'schema', 'data', 'clients', 'lookups' |
| status | enum | 'pending', 'running', 'completed', 'failed' |
| description | text | What was seeded |
| records_affected | integer | Number of records |
| error | text | Error message if failed |
| started_at | timestamp | Seed start time |
| completed_at | timestamp | Seed completion time |
| created_by | uuid | FK to users (null for system) |
| created_at | timestamp | Record created |

**Seeding Edge Functions:**
```
POST /admin/seed/schema     # Initialize database schema
POST /admin/seed/lookups    # Seed lookup tables
POST /admin/seed/data       # Seed base data (permissions, etc.)
POST /admin/seed/clients    # Sync clients from Snowflake
GET  /admin/seed/history    # View seed history
```

### 10.6 Activity Logging

Comprehensive activity tracking for audit and debugging.

#### activity_logs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users (null for system) |
| action | varchar | Action performed |
| resource | varchar | Resource type |
| resource_id | uuid | Resource identifier |
| details | jsonb | Action details |
| ip_address | varchar | Client IP |
| user_agent | text | Browser/device info |
| duration_ms | integer | Request duration |
| created_at | timestamp | When action occurred |

**Activity Action Examples:**
- `user.login`, `user.logout`, `user.password_change`
- `client.view`, `client.update_contact`, `client.search`
- `status.update`, `status.bulk_update`
- `fcash.update_tele_status`, `fcash.update_month`
- `sync.trigger`, `sync.complete`
- `export.request`, `export.download`
- `config.update`, `config.create`

### 10.7 Notification System (Future-Ready)

Prepared structure for notifications (optional implementation).

#### notification_templates
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar | Template identifier |
| name | varchar | Display name |
| channel | enum | 'email', 'sms', 'push', 'in_app' |
| subject | varchar | Email/notification subject |
| body_template | text | Template with {{variables}} |
| is_active | boolean | Template is active |
| created_at | timestamp | Record created |
| updated_at | timestamp | Record updated |

#### notifications
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| template_id | uuid | FK to notification_templates |
| channel | enum | Delivery channel |
| subject | varchar | Rendered subject |
| body | text | Rendered body |
| payload | jsonb | Template variables used |
| status | enum | 'pending', 'sent', 'failed', 'read' |
| sent_at | timestamp | When sent |
| read_at | timestamp | When read (in_app only) |
| error | text | Error message if failed |
| created_at | timestamp | Record created |

#### notification_preferences
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users |
| template_code | varchar | Which notification type |
| channel | enum | Which channel |
| enabled | boolean | User wants this notification |
| created_at | timestamp | Record created |
| updated_at | timestamp | Record updated |

### 10.8 File Attachments (Future-Ready)

Prepared structure for file attachments (optional implementation).

#### attachments
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| entity_type | varchar | What it's attached to (client, status, etc.) |
| entity_id | uuid | ID of parent entity |
| file_name | varchar | Original file name |
| file_type | varchar | MIME type |
| file_size | integer | Size in bytes |
| storage_path | varchar | Path in Supabase Storage |
| uploaded_by | uuid | FK to users |
| uploaded_at | timestamp | When uploaded |
| deleted_at | timestamp | Soft delete |

---

## 11. Additional Edge Functions

### 11.1 FCASH Functions

```
supabase/functions/
├── fcash/                          # FCASH-specific operations
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── list.ts                 # List FCASH clients
│   │   ├── get.ts                  # Get single client
│   │   ├── update-tele-status.ts   # Update tele/update status
│   │   ├── update-month.ts         # Update month to update
│   │   ├── history.ts              # Get update history
│   │   └── sync.ts                 # Trigger NextBank sync
│   └── services/
│       ├── fcash.service.ts
│       ├── nextbank-sync.service.ts
│       └── pointer.service.ts      # State machine logic
```

### 11.2 Auth Functions

```
supabase/functions/
├── auth/                           # Authentication operations
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── change-password.ts      # User password change
│   │   ├── reset-password.ts       # Admin reset to default
│   │   ├── toggle-status.ts        # Activate/deactivate user
│   │   └── sessions.ts             # View/revoke sessions
│   └── services/
│       └── auth.service.ts
```

### 11.3 Performance Functions

```
supabase/functions/
├── performance/                    # Performance metrics
│   ├── README.md
│   ├── index.ts
│   ├── handlers/
│   │   ├── tele-metrics.ts         # Telemarketer performance
│   │   ├── branch-metrics.ts       # Branch performance
│   │   └── snapshot.ts             # Trigger snapshot calculation
│   └── services/
│       └── performance.service.ts
```

---

## 12. Additional Frontend Pages

```
src/app/(dashboard)/
├── fcash/
│   ├── README.md
│   ├── page.tsx                    # FCASH client list
│   ├── [id]/page.tsx               # Client detail with update forms
│   └── _components/
│       ├── fcash-table.tsx
│       ├── fcash-filters.tsx
│       ├── tele-status-form.tsx    # Tele/Update status selection
│       ├── month-update-form.tsx   # Month to update form
│       ├── update-history.tsx      # Client update history
│       └── pointer-badge.tsx       # Shows current/touched state
│
├── performance/
│   ├── README.md
│   ├── page.tsx                    # Performance dashboard
│   ├── tele/page.tsx               # Telemarketer metrics
│   ├── branch/page.tsx             # Branch metrics
│   └── _components/
│       ├── performance-chart.tsx
│       ├── metrics-table.tsx
│       └── period-comparison.tsx
│
├── activity/
│   ├── README.md
│   ├── page.tsx                    # Activity log viewer
│   └── _components/
│       ├── activity-table.tsx
│       └── activity-filters.tsx
```

---

## 13. Additional Business Rules

### 13.1 PAR Status Display Mapping

| Code | Display Name | UI Category | Trackable |
|------|--------------|-------------|-----------|
| do_not_show | Current | Good | Yes |
| tele_130 | 30+ Days | Possible PAR | Yes |
| tele_hardcore | 60+ Days | PAR | No (excluded) |

### 13.2 Year Selection Logic

For the period selector, year options are determined by current month:
```typescript
function getAvailableYears(currentDate: Date): number[] {
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  if (currentMonth >= 9) { // September onwards
    return [currentYear - 1, currentYear, currentYear + 1];
  } else {
    return [currentYear - 2, currentYear - 1, currentYear];
  }
}
```

### 13.3 Self-Only Access Rule

Users with these roles only see their own records:
- `FC_TELE` — Only their own FCASH update histories
- `PCNI_TELE` — Only their own PCNI update histories
- `FC_BRANCH` — Only their assigned branch

Implemented via permission scope:
```typescript
// Permission with self-only flag
user_permissions: {
  permission: 'status:history:read',
  scope: 'self' | 'branch' | 'area' | 'all'
}
```

### 13.4 NextBank Custom Field Sync

When updating "Month to Update":
1. Update local `fcash_clients.month_to_update`
2. Call NextBank API: `POST /command/UpdateCustomer`
3. Store request/response in `fcash_update_history`
4. Update `pointer` to `touched_month`

```typescript
// NextBank Custom Field
{
  customFieldId: "month_to_update_id",
  customFieldName: "Month to Update (MM/DD/YYYY)",
  value: "01/15/2026"
}
```

### 13.5 Default Password Flow

1. New user created with `must_change_password = true`
2. On login attempt, check `must_change_password`
3. If true, return HTTP 402 with redirect to password change
4. After successful change, set `must_change_password = false`

---

## 14. Additional API Endpoints

### 14.1 Complete Endpoint List

| Category | Method | Path | Description |
|----------|--------|------|-------------|
| **Auth** | POST | /auth/login | Login |
| | POST | /auth/logout | Logout |
| | POST | /auth/change-password | Change own password |
| | POST | /auth/reset-password/:id | Admin reset password |
| | GET | /auth/sessions | List active sessions |
| | DELETE | /auth/sessions/:id | Revoke session |
| **Users** | GET | /users | List users |
| | GET | /users/:id | Get user |
| | POST | /users | Create user |
| | PATCH | /users/:id | Update user |
| | POST | /users/:id/toggle-status | Activate/deactivate |
| | GET | /users/filter-list | Users for dropdown |
| **Clients** | GET | /clients | List clients |
| | GET | /clients/:id | Get client |
| | PATCH | /clients/:id/contact | Update contact |
| | GET | /clients/loans/:code | Get loan details |
| **FCASH** | GET | /fcash | List FCASH clients |
| | GET | /fcash/:id | Get FCASH client |
| | POST | /fcash/:id/tele-status | Update tele status |
| | POST | /fcash/:id/month-update | Update month |
| | GET | /fcash/:id/history | Get update history |
| | GET | /fcash/filters | Get filter options |
| | POST | /fcash/sync | Trigger NextBank sync |
| **Status** | GET | /status/summary | Dashboard counts |
| | GET | /status/:clientId | Client status for period |
| | POST | /status/update | Update status |
| | POST | /status/bulk-update | Bulk update |
| | GET | /status/history | Status history |
| | GET | /status/history/:id | Single history record |
| **Performance** | GET | /performance/tele | Tele metrics |
| | GET | /performance/branch | Branch metrics |
| | POST | /performance/snapshot | Calculate snapshot |
| **Sync** | POST | /sync/snowflake | Trigger Snowflake sync |
| | POST | /sync/nextbank | Trigger NextBank sync |
| | GET | /sync/jobs | List sync jobs |
| | GET | /sync/jobs/:id | Get job status |
| **Reports** | POST | /reports/export | Request export |
| | GET | /reports/export/:id | Get export status |
| | GET | /reports/download/:id | Download file |
| | GET | /reports/history | Export history |
| **Admin** | GET | /admin/config/options | List config options |
| | POST | /admin/config/options | Create option |
| | PATCH | /admin/config/options/:id | Update option |
| | DELETE | /admin/config/options/:id | Delete option |
| | GET | /admin/config/settings | List settings |
| | PATCH | /admin/config/settings/:key | Update setting |
| | GET | /admin/audit-log | View audit log |
| | POST | /admin/seed/:type | Run seeder |
| | GET | /admin/seed/history | Seed history |
| **Organization** | GET | /branches | List branches |
| | POST | /branches | Create branch |
| | GET | /branches/:id | Get branch |
| | PATCH | /branches/:id | Update branch |
| | POST | /branches/:id/users | Assign users |
| | DELETE | /branches/:id/users/:userId | Remove user |
| | GET | /areas | List areas |
| | POST | /areas | Create area |
| | GET | /areas/:id | Get area |
| | PATCH | /areas/:id | Update area |
| | POST | /areas/:id/branches | Assign branches |
| **Activity** | GET | /activity | List activity logs |
| | GET | /activity/user/:id | User's activity |

---

## 15. Legacy Phase Structure (Deprecated)

> **NOTE:** See Section 8 for the revised, consolidated implementation phases.
> The phases below are kept for historical reference only.

The original 10-phase structure has been consolidated to 7 phases:
- Phases 0-1: Infrastructure & Foundation (unchanged)
- Phase 2: User Management (unchanged)
- Phase 3: Client Management (unchanged)
- Phase 4: Status Tracking - **now unified for both FCASH and PCNI**
- Phase 5: Organization & Admin (combined organization + config)
- Phase 6: Reports & Exports
- Phase 7: Polish & Documentation

The "FCASH Module" phase was **removed** because:
1. FCASH and PCNI share the same database schema
2. The difference is just company filter + workflow rules
3. Status tracking handles both with `company_id` filter

---

## 16. Key Indexes (Updated)

```sql
-- Existing indexes from section 2.8...

-- FCASH indexes
CREATE INDEX idx_fcash_clients_branch ON fcash_clients(branch_id);
CREATE INDEX idx_fcash_clients_pointer ON fcash_clients(pointer);
CREATE INDEX idx_fcash_clients_tele_status ON fcash_clients(tele_status_id);
CREATE INDEX idx_fcash_clients_normalized_name ON fcash_clients USING gin(normalized_name gin_trgm_ops);
CREATE INDEX idx_fcash_history_client ON fcash_update_history(fcash_client_id);
CREATE INDEX idx_fcash_history_created ON fcash_update_history(created_at DESC);

-- Performance indexes
CREATE INDEX idx_performance_entity ON performance_snapshots(type, entity_id);
CREATE INDEX idx_performance_period ON performance_snapshots(period_year, period_month);

-- Activity indexes
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_resource ON activity_logs(resource, resource_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

-- Session indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;
```

---

## 17. Infrastructure & Resilience

### 17.1 Caching Strategy

Use **Upstash Redis** for serverless-compatible caching with Supabase Edge Functions.

#### Cache Layers

| Layer | What to Cache | TTL | Invalidation |
|-------|---------------|-----|--------------|
| **Lookup Tables** | pension_types, status_types, products, etc. | 1 hour | On admin update |
| **User Permissions** | User's permissions + accessible branches | 5 minutes | On permission change |
| **Dashboard Summaries** | Status counts per period | 2 minutes | On status update |
| **Filter Options** | Branch list, product list for dropdowns | 10 minutes | On data change |
| **Config Settings** | System configuration values | 15 minutes | On setting update |

#### Cache Key Patterns

```typescript
// Key naming convention: {resource}:{identifier}:{variant}
const cacheKeys = {
  lookups: 'lookups:all',
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  userBranches: (userId: string) => `user:${userId}:branches`,
  dashboardSummary: (company: string, year: number, month: number) =>
    `dashboard:${company}:${year}:${month}`,
  filterOptions: (company: string) => `filters:${company}`,
  configSettings: 'config:settings',
}
```

#### Cache Service

```typescript
// _shared/cache/redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

export const cache = {
  get: <T>(key: string) => redis.get<T>(key),
  set: (key: string, value: any, ttlSeconds: number) =>
    redis.set(key, value, { ex: ttlSeconds }),
  del: (key: string) => redis.del(key),
  delPattern: async (pattern: string) => {
    const keys = await redis.keys(pattern)
    if (keys.length) await redis.del(...keys)
  },
}
```

#### Cache Invalidation Events

| Event | Keys to Invalidate |
|-------|-------------------|
| Status updated | `dashboard:*`, user's dashboard cache |
| Permission changed | `user:{userId}:permissions` |
| Lookup modified | `lookups:all`, `filters:*` |
| Config updated | `config:settings` |
| Branch/Area changed | `user:*:branches`, `filters:*` |

---

### 17.2 Queue System (Supabase Queue + pg_cron)

Since we're using Supabase, leverage **Supabase Queue** (pgmq) and **pg_cron** for job scheduling instead of BullMQ.

#### Queue Tables

##### job_queue
| Column | Type | Description |
|--------|------|-------------|
| id | bigserial | Primary key |
| queue_name | varchar | Queue identifier (exports, sync, notifications) |
| payload | jsonb | Job data |
| status | enum | 'pending', 'processing', 'completed', 'failed', 'dead' |
| priority | integer | Higher = processed first (default 0) |
| attempts | integer | Number of attempts made |
| max_attempts | integer | Max retries before dead letter (default 3) |
| scheduled_at | timestamp | When to process (for delayed jobs) |
| started_at | timestamp | Processing start |
| completed_at | timestamp | Processing end |
| error | text | Last error message |
| created_by | uuid | Who created the job |
| created_at | timestamp | Job created |

##### scheduled_jobs (Cron Configuration)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | varchar | Job name |
| cron_expression | varchar | Cron schedule (e.g., "0 6 * * *") |
| function_name | varchar | Edge function to call |
| payload | jsonb | Default payload |
| is_active | boolean | Whether schedule is active |
| last_run_at | timestamp | Last execution |
| next_run_at | timestamp | Next scheduled run |
| created_at | timestamp | Created |

#### Queue Names

| Queue | Purpose | Max Attempts | Timeout |
|-------|---------|--------------|---------|
| `exports` | File export generation | 3 | 5 minutes |
| `sync` | Snowflake/NextBank sync | 3 | 10 minutes |
| `notifications` | Email/SMS sending | 5 | 30 seconds |
| `cleanup` | Data archival/cleanup | 1 | 15 minutes |
| `performance` | Metrics calculation | 2 | 5 minutes |

#### Queue Service

```typescript
// _shared/queue/queue.service.ts
export const queue = {
  enqueue: async (queueName: string, payload: any, options?: {
    priority?: number
    scheduledAt?: Date
    maxAttempts?: number
  }) => {
    return await db.insert(jobQueue).values({
      queue_name: queueName,
      payload,
      priority: options?.priority ?? 0,
      scheduled_at: options?.scheduledAt ?? new Date(),
      max_attempts: options?.maxAttempts ?? 3,
      status: 'pending',
    })
  },

  dequeue: async (queueName: string) => {
    // Atomic fetch-and-lock using FOR UPDATE SKIP LOCKED
    return await db.execute(sql`
      UPDATE job_queue
      SET status = 'processing', started_at = NOW(), attempts = attempts + 1
      WHERE id = (
        SELECT id FROM job_queue
        WHERE queue_name = ${queueName}
          AND status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY priority DESC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `)
  },

  complete: async (jobId: number) => {
    await db.update(jobQueue)
      .set({ status: 'completed', completed_at: new Date() })
      .where(eq(jobQueue.id, jobId))
  },

  fail: async (jobId: number, error: string) => {
    const job = await db.query.jobQueue.findFirst({ where: eq(jobQueue.id, jobId) })
    const newStatus = job.attempts >= job.max_attempts ? 'dead' : 'pending'
    await db.update(jobQueue)
      .set({ status: newStatus, error, completed_at: new Date() })
      .where(eq(jobQueue.id, jobId))
  },
}
```

#### Scheduled Jobs (pg_cron)

```sql
-- Daily sync at 6 AM UTC
SELECT cron.schedule(
  'daily-snowflake-sync',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sync/snowflake',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Hourly performance snapshot
SELECT cron.schedule(
  'hourly-performance',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/performance/snapshot',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Daily cleanup at 2 AM UTC
SELECT cron.schedule(
  'daily-cleanup',
  '0 2 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/queue/cleanup',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

---

### 17.3 Rate Limiting

Protect APIs from abuse using Upstash Rate Limit.

#### Rate Limit Configuration

| Endpoint Category | Limit | Window | By |
|-------------------|-------|--------|-----|
| **Read endpoints** | 100 requests | 1 minute | User ID |
| **Write endpoints** | 30 requests | 1 minute | User ID |
| **Export requests** | 5 requests | 5 minutes | User ID |
| **Sync triggers** | 2 requests | 10 minutes | User ID |
| **Login attempts** | 5 requests | 5 minutes | IP Address |
| **Public endpoints** | 20 requests | 1 minute | IP Address |

#### Rate Limit Middleware

```typescript
// _shared/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

const rateLimiters = {
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    prefix: 'ratelimit:read',
  }),
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1m'),
    prefix: 'ratelimit:write',
  }),
  export: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5m'),
    prefix: 'ratelimit:export',
  }),
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5m'),
    prefix: 'ratelimit:login',
  }),
}

export async function checkRateLimit(
  type: keyof typeof rateLimiters,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const limiter = rateLimiters[type]
  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
```

---

### 17.4 Circuit Breaker

Prevent cascading failures when external services are down.

#### Circuit Breaker States

```
CLOSED (Normal)
   ↓ [Failure threshold reached]
OPEN (Failing fast, no requests sent)
   ↓ [After cooldown period]
HALF-OPEN (Testing with limited requests)
   ↓ [Success] → CLOSED
   ↓ [Failure] → OPEN
```

#### Circuit Breaker Configuration

| Service | Failure Threshold | Cooldown | Success Threshold |
|---------|-------------------|----------|-------------------|
| Snowflake | 5 failures | 60 seconds | 3 successes |
| NextBank | 3 failures | 30 seconds | 2 successes |
| Supabase Storage | 5 failures | 30 seconds | 2 successes |

#### Circuit Breaker Service

```typescript
// _shared/resilience/circuit-breaker.ts
interface CircuitState {
  status: 'closed' | 'open' | 'half-open'
  failures: number
  successes: number
  lastFailure: number | null
  lastCheck: number
}

export class CircuitBreaker {
  private state: CircuitState = {
    status: 'closed',
    failures: 0,
    successes: 0,
    lastFailure: null,
    lastCheck: Date.now(),
  }

  constructor(
    private name: string,
    private config: {
      failureThreshold: number
      cooldownMs: number
      successThreshold: number
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (Date.now() - this.state.lastCheck > this.config.cooldownMs) {
        this.state.status = 'half-open'
        this.state.successes = 0
      } else {
        throw new CircuitOpenError(`Circuit ${this.name} is open`)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state.status === 'half-open') {
      this.state.successes++
      if (this.state.successes >= this.config.successThreshold) {
        this.state.status = 'closed'
        this.state.failures = 0
      }
    } else {
      this.state.failures = 0
    }
  }

  private onFailure() {
    this.state.failures++
    this.state.lastFailure = Date.now()
    this.state.lastCheck = Date.now()

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.status = 'open'
    }
  }
}

// Usage
export const circuits = {
  snowflake: new CircuitBreaker('snowflake', {
    failureThreshold: 5,
    cooldownMs: 60000,
    successThreshold: 3,
  }),
  nextbank: new CircuitBreaker('nextbank', {
    failureThreshold: 3,
    cooldownMs: 30000,
    successThreshold: 2,
  }),
}
```

---

### 17.5 Data Retention & Archival

Prevent unbounded table growth with automatic cleanup.

#### Retention Policies

| Table | Retention Period | Archive Strategy |
|-------|------------------|------------------|
| activity_logs | 90 days | Move to cold storage (S3) |
| status_events | 2 years | Keep, critical audit data |
| fcash_update_history | 2 years | Keep, critical audit data |
| job_queue (completed) | 7 days | Delete |
| job_queue (dead) | 30 days | Archive to logs |
| user_sessions (expired) | 7 days | Delete |
| notifications (sent) | 30 days | Delete |
| export_jobs (completed) | 30 days | Delete files, keep metadata |
| sync_jobs (completed) | 90 days | Keep for auditing |

#### Archive Tables

##### archived_activity_logs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Original ID |
| archived_data | jsonb | Full original record |
| archived_at | timestamp | When archived |
| archive_batch | varchar | Batch identifier |

#### Cleanup Function

```typescript
// supabase/functions/queue/handlers/cleanup.ts
export async function handleCleanup() {
  const results = {
    activity_logs: 0,
    job_queue: 0,
    user_sessions: 0,
    export_files: 0,
  }

  // Archive old activity logs
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const oldLogs = await db.query.activityLogs.findMany({
    where: lt(activityLogs.created_at, cutoff),
    limit: 10000,
  })

  if (oldLogs.length) {
    // Insert to archive
    await db.insert(archivedActivityLogs).values(
      oldLogs.map(log => ({
        id: log.id,
        archived_data: log,
        archived_at: new Date(),
        archive_batch: `batch-${Date.now()}`,
      }))
    )

    // Delete from main table
    await db.delete(activityLogs)
      .where(inArray(activityLogs.id, oldLogs.map(l => l.id)))

    results.activity_logs = oldLogs.length
  }

  // Delete old completed jobs
  const jobCutoff = new Date()
  jobCutoff.setDate(jobCutoff.getDate() - 7)

  const { count } = await db.delete(jobQueue)
    .where(and(
      eq(jobQueue.status, 'completed'),
      lt(jobQueue.completed_at, jobCutoff)
    ))
  results.job_queue = count

  // Delete expired sessions
  const { count: sessionCount } = await db.delete(userSessions)
    .where(lt(userSessions.expires_at, new Date()))
  results.user_sessions = sessionCount

  // Delete expired export files
  const expiredExports = await db.query.exportJobs.findMany({
    where: and(
      eq(exportJobs.status, 'completed'),
      lt(exportJobs.expires_at, new Date())
    ),
  })

  for (const job of expiredExports) {
    if (job.file_path) {
      await supabase.storage.from('exports').remove([job.file_path])
      results.export_files++
    }
  }

  return results
}
```

---

### 17.6 Health Checks & Observability

#### Health Check Endpoint

```typescript
// GET /health
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-01-05T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": { "status": "healthy", "latency_ms": 5 },
    "redis": { "status": "healthy", "latency_ms": 2 },
    "snowflake": { "status": "healthy", "latency_ms": 150 },
    "nextbank": { "status": "degraded", "latency_ms": 2000, "circuit": "half-open" },
    "storage": { "status": "healthy", "latency_ms": 50 }
  },
  "queues": {
    "exports": { "pending": 5, "processing": 2, "dead": 0 },
    "sync": { "pending": 0, "processing": 1, "dead": 0 }
  }
}
```

#### Logging Structure

```typescript
// _shared/logging/logger.ts
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  requestId: string
  userId?: string
  action?: string
  resource?: string
  resourceId?: string
  duration_ms?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
}

export const logger = {
  info: (message: string, meta?: Partial<LogEntry>) => {
    console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }))
  },
  error: (message: string, error: Error, meta?: Partial<LogEntry>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: { name: error.name, message: error.message, stack: error.stack },
      ...meta,
    }))
  },
  // ... warn, debug
}
```

#### Request Tracing

```typescript
// _shared/middleware/tracing.ts
export function withTracing(handler: Handler): Handler {
  return async (req: Request) => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
    const start = Date.now()

    try {
      const response = await handler(req)

      logger.info('Request completed', {
        requestId,
        duration_ms: Date.now() - start,
        status: response.status,
        path: new URL(req.url).pathname,
        method: req.method,
      })

      return new Response(response.body, {
        ...response,
        headers: {
          ...Object.fromEntries(response.headers),
          'x-request-id': requestId,
        },
      })
    } catch (error) {
      logger.error('Request failed', error as Error, {
        requestId,
        duration_ms: Date.now() - start,
        path: new URL(req.url).pathname,
        method: req.method,
      })
      throw error
    }
  }
}
```

---

### 17.7 API Safeguards

#### Pagination Limits

```typescript
// _shared/utils/pagination.ts
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 25

export function parsePagination(params: URLSearchParams) {
  const page = Math.max(1, parseInt(params.get('page') || '1'))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(params.get('pageSize') || String(DEFAULT_PAGE_SIZE)))
  )

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  }
}
```

#### Request Timeout

```typescript
// _shared/utils/timeout.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
  })

  return Promise.race([promise, timeout])
}

// Usage
const data = await withTimeout(
  snowflake.query('SELECT ...'),
  30000,
  'Snowflake query'
)
```

#### Request Validation

```typescript
// _shared/utils/validation.ts
import { z } from 'zod'

// Strict ID validation
export const uuidSchema = z.string().uuid()

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(25),
})

// Date range validation (max 1 year)
export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine(
  data => (data.to.getTime() - data.from.getTime()) <= 365 * 24 * 60 * 60 * 1000,
  { message: 'Date range cannot exceed 1 year' }
)
```

---

### 17.8 Environment Variables (Updated)

```env
# Existing variables...

# Upstash Redis (Caching & Rate Limiting)
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# Queue Configuration
QUEUE_EXPORT_MAX_ATTEMPTS=3
QUEUE_SYNC_MAX_ATTEMPTS=3
QUEUE_EXPORT_TIMEOUT_MS=300000
QUEUE_SYNC_TIMEOUT_MS=600000

# Rate Limiting
RATE_LIMIT_READ_REQUESTS=100
RATE_LIMIT_WRITE_REQUESTS=30
RATE_LIMIT_EXPORT_REQUESTS=5
RATE_LIMIT_LOGIN_ATTEMPTS=5

# Circuit Breaker
CIRCUIT_SNOWFLAKE_THRESHOLD=5
CIRCUIT_SNOWFLAKE_COOLDOWN_MS=60000
CIRCUIT_NEXTBANK_THRESHOLD=3
CIRCUIT_NEXTBANK_COOLDOWN_MS=30000

# Data Retention (days)
RETENTION_ACTIVITY_LOGS=90
RETENTION_COMPLETED_JOBS=7
RETENTION_EXPIRED_SESSIONS=7
RETENTION_EXPORT_FILES=30

# Health Check
HEALTH_CHECK_TIMEOUT_MS=5000
```

---

## 18. Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-05 | Initial design document | AI-assisted |
| 2026-01-05 | Added infrastructure patterns (caching, rate limiting, circuit breaker) | AI-assisted |
| 2026-01-05 | **Consolidated phases** - Removed separate FCASH Module, unified status tracking | AI-assisted |

---

*This design document was created collaboratively through AI-assisted brainstorming, enhanced after comprehensive legacy codebase analysis, and hardened with production infrastructure patterns.*
