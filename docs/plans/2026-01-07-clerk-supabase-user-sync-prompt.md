# Clerk to Supabase User Synchronization - Orchestrator Prompt

## Overview

Implement automatic user synchronization between Clerk (authentication service) and Supabase (database). Clerk handles authentication only, while Supabase stores the user data with `clerk_id` as the reference key for other tables.

## Architecture

```mermaid
flowchart TD
    A[User Signs Up] --> B[Clerk Creates User]
    B --> C[Clerk Triggers Webhook]
    C --> D[Webhook Handler]
    D --> E[Verify Signature]
    E --> F[Extract User Data]
    F --> G[Create User in Supabase]
    G --> H[Store clerk_id as Reference]
    H --> I[Return Success Response]

    J[User Updates Profile] --> K[Clerk Updates User]
    K --> L[Clerk Triggers Webhook]
    L --> D

    M[User Deleted] --> N[Clerk Triggers Webhook]
    N --> O[Soft Delete User in Supabase]
    O --> P[Set deleted_at Timestamp]
```

## Key Requirements

### 1. Clerk Webhook Configuration
- Webhook endpoint: `/api/webhooks/clerk`
- Events to handle:
  - `user.created` - Create new user in Supabase
  - `user.updated` - Update user data in Supabase
  - `user.deleted` - Soft delete user in Supabase
  - `session.created` - Record user login
  - `session.ended` - Handle session end
  - `organizationMembership.created` - Update user's organization
  - `organizationMembership.updated` - Update user's organization

### 2. Supabase User Schema
The `users` table must include:
- `id` (UUID, primary key) - Internal UUID for database operations
- `clerk_id` (varchar, unique) - Clerk user ID as reference key
- `email` (varchar, unique, not null)
- `first_name` (varchar, nullable)
- `last_name` (varchar, nullable)
- `image_url` (text, nullable)
- `clerk_org_id` (text, nullable) - Clerk organization ID
- `is_active` (boolean, default true)
- `last_login_at` (timestamp, nullable)
- `login_count` (integer, default 0)
- `failed_login_count` (integer, default 0)
- `locked_until` (timestamp, nullable)
- `deleted_at` (timestamp, nullable) - For soft delete
- `created_at` (timestamp, default now)
- `updated_at` (timestamp, default now)

### 3. Webhook Handler Implementation
Located at: `src/app/api/webhooks/clerk/route.ts`

**Key responsibilities:**
1. Verify Svix webhook signature
2. Parse and validate webhook events
3. Handle different event types
4. Log all operations for debugging
5. Return appropriate HTTP status codes

### 4. Database Query Functions
Located at: `src/server/db/queries/users.ts`

**Required functions:**
- `createUser(db, data)` - Create new user
- `updateUser(db, userId, data)` - Update user fields
- `deactivateUser(db, userId)` - Soft delete user
- `getUserByClerkId(clerkId)` - Find user by Clerk ID
- `recordUserLogin(db, userId, ipAddress, userAgent)` - Track logins

### 5. Environment Variables
Required in `.env`:
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Implementation Steps

### Step 1: Verify Webhook Setup
- Ensure Clerk webhook is configured in Clerk Dashboard
- Verify webhook endpoint URL is accessible
- Confirm webhook secret is set in environment variables

### Step 2: Review User Schema
- Check `src/server/db/schema/users.ts` for correct schema
- Ensure `clerk_id` field is present and unique
- Verify all required fields are present

### Step 3: Implement Webhook Handler
The webhook handler should:

**For `user.created` event:**
```typescript
if (eventType === "user.created") {
  const { id, email_addresses, first_name, last_name, image_url } = event.data;

  // Generate internal UUID
  const internalId = crypto.randomUUID();
  const email = email_addresses[0]?.email_address ?? "";

  await createUser(db, {
    id: internalId,
    clerkId: id,
    email,
    firstName: first_name ?? null,
    lastName: last_name ?? null,
    imageUrl: image_url ?? null,
  });
}
```

**For `user.updated` event:**
```typescript
if (eventType === "user.updated") {
  const { id, email_addresses, first_name, last_name, image_url } = event.data;

  const existingUser = await getUserByClerkId(id);
  if (!existingUser) {
    return new Response("Error: User not found", { status: 404 });
  }

  await updateUser(db, existingUser.id, {
    email: email_addresses?.[0]?.email_address,
    firstName: first_name,
    lastName: last_name,
    imageUrl: image_url,
  });
}
```

**For `user.deleted` event:**
```typescript
if (eventType === "user.deleted") {
  const { id } = event.data;

  const existingUser = await getUserByClerkId(id);
  if (!existingUser) {
    return new Response("Error: User not found", { status: 404 });
  }

  // Soft delete user
  await deactivateUser(db, existingUser.id);
}
```

**For `session.created` event:**
```typescript
if (eventType === "session.created") {
  const data = event.data as any;
  const userId = data.user_id;
  const ipAddress = data.ip_address ?? "unknown";
  const userAgent = data.user_agent ?? "unknown";

  const existingUser = await getUserByClerkId(userId);
  if (!existingUser) {
    return new Response("Error: User not found", { status: 404 });
  }

  // Record login
  await recordUserLogin(db, existingUser.id, ipAddress, userAgent);
}
```

### Step 4: Handle Organization Memberships
```typescript
if (eventType === "organizationMembership.created" ||
    eventType === "organizationMembership.updated") {
  const data = event.data as any;
  const userId = data.public_user_data.user_id;
  const orgId = data.organization.id;

  const existingUser = await getUserByClerkId(userId);
  if (!existingUser) {
    return new Response("Error: User not found", { status: 404 });
  }

  await updateUser(db, existingUser.id, {
    clerkOrgId: orgId,
  });
}
```

### Step 5: Error Handling and Logging
- Log all webhook events received
- Log successful operations
- Log errors with context
- Return appropriate HTTP status codes:
  - 200: Success
  - 400: Bad request (missing headers, invalid signature)
  - 404: User not found
  - 500: Internal server error

### Step 6: Testing
1. Create a test user in Clerk
2. Verify user is created in Supabase with correct `clerk_id`
3. Update user profile in Clerk
4. Verify user is updated in Supabase
5. Delete user in Clerk
6. Verify user is soft deleted in Supabase (deleted_at is set)
7. Check logs for all operations

## Data Flow

### User Creation Flow
```
1. User signs up in Clerk
2. Clerk creates user account
3. Clerk sends user.created webhook
4. Webhook handler receives event
5. Handler verifies signature
6. Handler extracts user data
7. Handler creates user in Supabase
8. User record includes:
   - Internal UUID as primary key
   - clerk_id as reference field
   - Email, name, image_url
9. Handler returns 200 OK
```

### User Update Flow
```
1. User updates profile in Clerk
2. Clerk updates user account
3. Clerk sends user.updated webhook
4. Webhook handler receives event
5. Handler finds user by clerk_id
6. Handler updates user fields in Supabase
7. Handler returns 200 OK
```

### User Deletion Flow
```
1. User is deleted in Clerk
2. Clerk sends user.deleted webhook
3. Webhook handler receives event
4. Handler finds user by clerk_id
5. Handler soft deletes user in Supabase:
   - Sets deleted_at timestamp
   - Sets is_active to false
6. Handler returns 200 OK
```

## Important Notes

1. **clerk_id is the reference key**: All other tables that need to reference users should use the internal UUID (id field), not clerk_id. The clerk_id is only used for synchronization.

2. **Soft delete is required**: Never hard delete users. Always use soft delete by setting deleted_at timestamp.

3. **Webhook reliability**: Clerk will retry webhooks if they fail. Ensure your handler is idempotent.

4. **Security**: Always verify webhook signatures to prevent spoofing attacks.

5. **Logging**: Comprehensive logging is essential for debugging webhook issues.

6. **Error handling**: Return appropriate HTTP status codes to help Clerk understand what went wrong.

## Related Files

- `src/app/api/webhooks/clerk/route.ts` - Webhook handler
- `src/server/db/schema/users.ts` - User schema definition
- `src/server/db/queries/users.ts` - Database query functions
- `src/middleware.ts` - Route protection
- `docs/framework/clerk-authentication.md` - Clerk documentation
- `docs/framework/supabase-integration.md` - Supabase documentation

## API Documentation

### Webhook Endpoint

**Endpoint**: `POST /api/webhooks/clerk`

**Description**: Receives webhook events from Clerk to synchronize user data with Supabase database.

### Request

**Headers**:

| Header | Type | Required | Description |
|---------|-------|-----------|-------------|
| `svix-id` | string | Yes | Unique identifier for the webhook event |
| `svix-timestamp` | string | Yes | Unix timestamp of when the webhook was sent |
| `svix-signature` | string | Yes | HMAC signature for payload verification |
| `Content-Type` | string | Yes | Must be `application/json` |

**Body**: JSON payload containing Clerk webhook event data.

**Example Request**:

```http
POST /api/webhooks/clerk HTTP/1.1
Host: your-domain.com
Content-Type: application/json
svix-id: msg_1234567890
svix-timestamp: 1704624000
svix-signature: v1,abc123def456...

{
  "data": {
    "id": "user_abc123",
    "email_addresses": [
      {
        "id": "idn_abc123",
        "email_address": "user@example.com",
        "verification": {
          "status": "verified"
        }
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://example.com/avatar.jpg",
    "created_at": 1704624000000,
    "updated_at": 1704624000000
  },
  "object": "event",
  "type": "user.created",
  "created_at": 1704624000000
}
```

### Supported Event Types

| Event Type | Description | Action |
|-------------|-------------|---------|
| `user.created` | New user registered in Clerk | Create user in Supabase |
| `user.updated` | User profile updated in Clerk | Update user in Supabase |
| `user.deleted` | User deleted in Clerk | Soft delete user in Supabase |
| `session.created` | User session created | Record user login |
| `session.ended` | User session ended | Log session end |
| `organizationMembership.created` | User joined organization | Update user's organization ID |
| `organizationMembership.updated` | User's organization membership changed | Update user's organization ID |

### Response

**Success Response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true
}
```

**Error Responses**:

| Status Code | Description | Body |
|-------------|-------------|-------|
| 400 | Bad Request (missing headers, invalid signature) | `{"error": "Error: Missing Svix headers"}` |
| 403 | Unauthorized (IP not whitelisted) | `{"error": "Error: Unauthorized"}` |
| 404 | User not found | `{"error": "Error: User not found"}` |
| 413 | Payload too large | `{"error": "Error: Payload too large"}` |
| 429 | Rate limit exceeded | `{"error": "Error: Rate limit exceeded"}` |
| 500 | Internal server error | `{"error": "Error: Webhook processing failed"}` |

### Event Payloads

#### user.created

**Payload Structure**:

```typescript
{
  data: {
    id: string;                    // Clerk user ID
    email_addresses: Array<{
      id: string;
      email_address: string;
      verification: {
        status: 'verified' | 'unverified';
      };
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number;             // Unix timestamp in milliseconds
    updated_at: number;             // Unix timestamp in milliseconds
  };
  object: 'event';
  type: 'user.created';
  created_at: number;
}
```

**Database Action**: Creates new user record with:
- Internal UUID as primary key
- `clerk_id` from `data.id`
- Email from first email address
- First name, last name, image URL
- Default values for `is_active`, `login_count`, etc.

#### user.updated

**Payload Structure**: Same as `user.created`

**Database Action**: Updates existing user record found by `clerk_id`:
- Updates email, first name, last name, image URL
- Sets `updated_at` timestamp

#### user.deleted

**Payload Structure**:

```typescript
{
  data: {
    id: string;                    // Clerk user ID
    deleted: boolean;
  };
  object: 'event';
  type: 'user.deleted';
  created_at: number;
}
```

**Database Action**: Soft deletes user:
- Sets `deleted_at` timestamp
- Sets `is_active` to `false`
- User record remains in database

#### session.created

**Payload Structure**:

```typescript
{
  data: {
    id: string;                    // Session ID
    user_id: string;               // Clerk user ID
    status: 'active' | 'ended';
    last_active_at: number;
    expire_at: number;
    abandon_at: number;
    ip_address: string | null;
    user_agent: string | null;
  };
  object: 'event';
  type: 'session.created';
  created_at: number;
}
```

**Database Action**: Records user login:
- Updates `last_login_at` timestamp
- Increments `login_count`
- Resets `failed_login_count` to 0

#### session.ended

**Payload Structure**: Similar to `session.created`

**Database Action**: Logs session end (no database update required)

#### organizationMembership.created / organizationMembership.updated

**Payload Structure**:

```typescript
{
  data: {
    id: string;                    // Membership ID
    organization: {
      id: string;                  // Organization ID
      name: string;
      slug: string;
    };
    public_user_data: {
      user_id: string;             // Clerk user ID
      first_name: string;
      last_name: string;
      profile_image_url: string;
    };
    role: string;                  // e.g., 'admin', 'member'
    created_at: number;
    updated_at: number;
  };
  object: 'event';
  type: 'organizationMembership.created' | 'organizationMembership.updated';
  created_at: number;
}
```

**Database Action**: Updates user's organization:
- Sets `clerk_org_id` from `data.organization.id`

### Rate Limiting

**Limits**:
- 100 requests per minute per IP address
- 1000 requests per hour per IP address

**Headers** (on rate limit exceeded):

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704624600

{
  "error": "Error: Rate limit exceeded"
}
```

### Security

**Signature Verification**:
All requests are verified using HMAC-SHA256 signature:
- Signature is in `svix-signature` header
- Computed using `CLERK_WEBHOOK_SECRET`
- Prevents request tampering

**Timestamp Validation**:
- Requests older than 5 minutes are rejected
- Prevents replay attacks

**IP Whitelisting**:
- Only requests from Clerk webhook IPs are accepted
- Prevents unauthorized access

### Testing the Webhook

**Using Clerk CLI**:

```bash
# Install Clerk CLI
pnpm add -g @clerk/clerk-cli

# Authenticate
clerk login

# Test webhook
clerk webhook test user.created

# Test with custom payload
clerk webhook test user.created --data='{"id":"test_user","email_addresses":[{"email_address":"test@example.com"}]}'
```

**Using cURL**:

```bash
# Test webhook endpoint (requires valid signature)
curl -X POST https://your-domain.com/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test_id" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: test_signature" \
  -d '{"type":"user.created","data":{"id":"test_user"}}'
```

**Using ngrok for Local Testing**:

```bash
# Start ngrok
ngrok http 3000

# Update webhook URL in Clerk Dashboard to ngrok URL
# https://your-ngrok-url.ngrok-free.app/api/webhooks/clerk
```

### Error Codes Reference

| Error Code | HTTP Status | Description | Retry |
|------------|-------------|-------------|--------|
| `MISSING_HEADERS` | 400 | Required Svix headers are missing | No |
| `INVALID_SIGNATURE` | 400 | Webhook signature is invalid | No |
| `TIMESTAMP_TOO_OLD` | 400 | Webhook timestamp is too old | No |
| `USER_NOT_FOUND` | 404 | User not found in database | No |
| `UNAUTHORIZED_IP` | 403 | Request from unauthorized IP | No |
| `PAYLOAD_TOO_LARGE` | 413 | Request payload exceeds 10MB | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded | Yes |
| `DATABASE_ERROR` | 500 | Database operation failed | Yes |
| `INTERNAL_ERROR` | 500 | Internal server error | Yes |

### Webhook Retry Behavior

Clerk will retry failed webhooks with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 6 hours |
| 7 | 12 hours |
| 8 | 24 hours |

**Note**: Return 2xx status codes to prevent retries. Return 4xx or 5xx to trigger retries.

### Best Practices for Consumers

1. **Always verify signatures**: Never skip signature verification
2. **Use idempotent operations**: Handle duplicate events gracefully
3. **Return quickly**: Webhook processing should complete within 5 seconds
4. **Log all events**: Maintain audit trail for debugging
5. **Monitor failures**: Set up alerts for webhook failures
6. **Test thoroughly**: Test all event types before production

## Quick Start Guide

### Prerequisites

1. **Clerk Account** with webhook configured
2. **Supabase Project** with database set up
3. **Node.js** v18 or higher
4. **pnpm** package manager

### Step-by-Step Implementation (15 minutes)

**Step 1: Environment Setup (2 minutes)**

```bash
# Copy environment template
cp .env.example .env

# Add required variables to .env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Step 2: Verify Database Schema (2 minutes)**

```bash
# Check if users table exists with correct schema
pnpm db:studio

# Verify these columns exist:
# - id (UUID, primary key)
# - clerk_id (varchar, unique)
# - email (varchar, unique, not null)
# - first_name (varchar, nullable)
# - last_name (varchar, nullable)
# - image_url (text, nullable)
# - clerk_org_id (text, nullable)
# - is_active (boolean, default true)
# - last_login_at (timestamp, nullable)
# - login_count (integer, default 0)
# - failed_login_count (integer, default 0)
# - locked_until (timestamp, nullable)
# - deleted_at (timestamp, nullable)
# - created_at (timestamp, default now)
# - updated_at (timestamp, default now)
```

**Step 3: Create Webhook Handler (5 minutes)**

Create or update `src/app/api/webhooks/clerk/route.ts`:

```typescript
import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { env } from "@/config/env";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
  createUser,
  updateUser,
  deactivateUser,
  getUserByClerkId,
  recordUserLogin,
} from "@/server/db/queries/users";

export async function POST(req: Request) {
  try {
    // Get headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error: Missing Svix headers", { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Verify webhook
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET ?? "");
    let event: WebhookEvent;

    try {
      event = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      return new Response("Error: Invalid signature", { status: 400 });
    }

    const eventType = event.type;

    // Handle user.created
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      const internalId = crypto.randomUUID();
      const email = email_addresses[0]?.email_address ?? "";

      await createUser(db, {
        id: internalId,
        clerkId: id,
        email,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        imageUrl: image_url ?? null,
      });
    }

    // Handle user.updated
    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      const existingUser = await getUserByClerkId(id);

      if (!existingUser) {
        return new Response("Error: User not found", { status: 404 });
      }

      await updateUser(db, existingUser.id, {
        email: email_addresses?.[0]?.email_address,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      });
    }

    // Handle user.deleted
    if (eventType === "user.deleted") {
      const { id } = event.data;
      const existingUser = await getUserByClerkId(id);

      if (!existingUser) {
        return new Response("Error: User not found", { status: 404 });
      }

      await deactivateUser(db, existingUser.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    logger.error("Error processing webhook", error as Error);
    return new Response("Error: Webhook processing failed", { status: 500 });
  }
}
```

**Step 4: Configure Clerk Webhook (3 minutes)**

1. Go to Clerk Dashboard → Your App → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy webhook secret to `.env` file
5. Test webhook

**Step 5: Test Implementation (3 minutes)**

```bash
# Create a test user in Clerk Dashboard
# Check webhook logs in Clerk Dashboard
# Verify user appears in Supabase

# Or use Clerk CLI
pnpm add -g @clerk/clerk-cli
clerk webhook test user.created
```

**Verification Queries**:

```sql
-- Check if user was created
SELECT id, clerk_id, email, first_name, last_name, created_at
FROM users
ORDER BY created_at DESC
LIMIT 1;
```

### Common Gotchas

1. **Webhook URL**: Must be publicly accessible (use ngrok for local testing)
2. **Webhook Secret**: Must match exactly what's in Clerk Dashboard
3. **Database Connection**: Ensure `DATABASE_URL` uses Transaction mode (port 6543)
4. **clerk_id**: Must be unique in database
5. **Soft Delete**: Never hard delete users, always use `deleted_at`

## Troubleshooting

### Common Issues and Solutions

**Issue 1: Webhook signature verification fails**

```
Error: Error verifying webhook: Invalid signature
```

**Solutions**:
1. Verify `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard exactly
2. Check for whitespace in the secret value
3. Ensure webhook endpoint URL is correct
4. Test with Clerk CLI: `clerk webhook test user.created`

**Issue 2: User not created in Supabase**

```
User created in Clerk but not appearing in database
```

**Solutions**:
1. Check webhook logs in Clerk Dashboard for errors
2. Verify database connection is working
3. Check application logs for errors
4. Ensure webhook endpoint is accessible (test with curl)
5. Verify `DATABASE_URL` is correct and uses Transaction mode

**Issue 3: Duplicate users created**

```
Same user appears multiple times in database
```

**Solutions**:
1. Ensure `clerk_id` has unique constraint
2. Implement idempotency check before creating user
3. Check if webhook is being retried incorrectly

**Issue 4: Webhook timeout**

```
Clerk webhook times out (takes > 5 seconds)
```

**Solutions**:
1. Optimize database queries (use indexes)
2. Move non-critical operations to background jobs
3. Implement caching for frequently accessed data
4. Check database connection pool settings

**Issue 5: User not found on update**

```
Error: User not found (404) when updating user
```

**Solutions**:
1. Verify user was created successfully initially
2. Check if `clerk_id` is stored correctly
3. Query database directly to find the user
4. Consider auto-creating user if not found

**Issue 6: Database connection errors**

```
Error: Connection timeout or connection refused
```

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check if using Transaction mode (port 6543)
3. Ensure Supabase project is active
4. Check firewall/network settings
5. Verify SSL certificate is valid

**Issue 7: Rate limit exceeded**

```
Error: Rate limit exceeded (429)
```

**Solutions**:
1. Implement rate limiting on webhook endpoint
2. Check for webhook spam or abuse
3. Monitor webhook event rate
4. Consider increasing rate limit if legitimate traffic

**Issue 8: Out-of-order events**

```
user.updated event arrives before user.created
```

**Solutions**:
1. Implement auto-create logic for missing users
2. Use event timestamps to detect out-of-order events
3. Queue events for processing in order
4. Monitor for this pattern in logs

### Debugging Tips

**Enable Debug Logging**:

```typescript
// Set log level to debug
process.env.LOG_LEVEL = 'debug';

// Add detailed logging
logger.debug("Webhook payload", {
  eventType,
  payload: JSON.stringify(event.data),
});
```

**Test Webhook Locally**:

```bash
# Install ngrok
pnpm add -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Update webhook URL in Clerk Dashboard to ngrok URL
# https://your-ngrok-url.ngrok-free.app/api/webhooks/clerk
```

**Monitor Database in Real-Time**:

```sql
-- Create a trigger to log user changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'User changed: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_user_changes();
```

**Check Clerk Webhook Logs**:

1. Go to Clerk Dashboard → Your App → Webhooks
2. Click on your webhook endpoint
3. View delivery attempts and responses
4. Check for failed attempts and error messages

### Getting Help

If you're still having issues:

1. **Check Logs**: Review application logs for detailed error messages
2. **Clerk Dashboard**: Check webhook delivery logs
3. **Supabase Dashboard**: Check database logs and query performance
4. **Community**: Search Clerk and Supabase community forums
5. **Documentation**: Refer to Clerk and Supabase official documentation

## Deployment Considerations

### Environment Variables

**Production Variables**:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_live_xxx

# Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Security Notes**:
- Never commit `.env` files to version control
- Use secrets management (Vercel Environment Variables, AWS Secrets Manager, etc.)
- Rotate webhook secrets regularly
- Use different secrets for staging and production

### Deployment Platforms

**Vercel**:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard
# Settings → Environment Variables
```

**Vercel Configuration** (`vercel.json`):

```json
{
  "functions": {
    "src/app/api/webhooks/clerk/route.ts": {
      "maxDuration": 10
    }
  }
}
```

**Docker**:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - CLERK_WEBHOOK_SECRET=${CLERK_WEBHOOK_SECRET}
```

### Database Migrations

**Before Deployment**:

```bash
# Generate migration
pnpm db:generate

# Review migration file
cat src/server/db/migrations/0001_*.sql

# Test migration locally
pnpm db:migrate
```

**Production Migration**:

```bash
# Backup database before migration
pg_dump $DATABASE_URL > backup.sql

# Apply migration
pnpm db:migrate

# Verify migration
pnpm db:studio
```

### Monitoring in Production

**Set Up Alerts**:

1. **Clerk Webhook Failures**: Configure alerts in Clerk Dashboard
2. **Database Errors**: Set up Supabase error reporting
3. **Application Errors**: Use error tracking (Sentry, LogRocket)
4. **Performance**: Monitor webhook processing time

**Health Checks**:

```typescript
// GET /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    clerk: await checkClerk(),
    webhook: await checkWebhook(),
  };

  const isHealthy = Object.values(checks).every((check) => check.status === 'ok');

  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: isHealthy ? 200 : 503 });
}
```

### Scaling Considerations

**Horizontal Scaling**:

- Webhook endpoint is stateless, can scale horizontally
- Use load balancer to distribute webhook traffic
- Consider serverless functions (Vercel, AWS Lambda) for auto-scaling

**Vertical Scaling**:

- Increase database connection pool size
- Add more CPU/memory for webhook processing
- Use read replicas for database queries

**Caching Strategy**:

```typescript
// Use Redis for distributed caching
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedUser(clerkId: string) {
  const cached = await redis.get(`user:${clerkId}`);
  if (cached) return JSON.parse(cached);

  const user = await getUserByClerkId(clerkId);
  await redis.setex(`user:${clerkId}`, 300, JSON.stringify(user)); // 5 minutes
  return user;
}
```

### Rollback Strategy

**Database Rollback**:

```bash
# Rollback last migration
pnpm db:rollback

# Or restore from backup
psql $DATABASE_URL < backup.sql
```

**Application Rollback**:

```bash
# Vercel rollback
vercel rollback

# Or deploy previous version
git checkout <previous-commit>
vercel --prod
```

### Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Database migrations applied successfully
- [ ] Webhook endpoint is accessible
- [ ] Clerk webhook is configured with production URL
- [ ] Monitoring and alerting are configured
- [ ] Health checks are passing
- [ ] Error tracking is enabled
- [ ] Logs are being collected
- [ ] Performance is within acceptable limits
- [ ] Security headers are configured
- [ ] SSL/TLS is enabled
- [ ] Backup strategy is in place

## Testing Procedures

### Unit Testing

**Test File**: `src/app/api/webhooks/clerk/__tests__/route.test.ts`

**Test Cases**:

1. **Webhook Signature Verification**
   - Valid signature should pass
   - Invalid signature should return 400
   - Missing headers should return 400
   - Expired timestamp should return 400

2. **User Creation**
   - Mock Clerk webhook event with user data
   - Verify user is created in database
   - Verify clerk_id is stored correctly
   - Verify internal UUID is generated
   - Verify all fields are populated correctly

3. **User Update**
   - Mock Clerk webhook event with updated data
   - Verify user is updated in database
   - Verify only changed fields are updated
   - Verify updated_at timestamp is set

4. **User Deletion**
   - Mock Clerk webhook event with deletion
   - Verify user is soft deleted (deleted_at set)
   - Verify is_active is set to false
   - Verify user still exists in database (not hard deleted)

5. **Organization Membership**
   - Mock organization membership creation
   - Verify clerk_org_id is updated
   - Handle multiple organization memberships

6. **Session Tracking**
   - Mock session creation event
   - Verify last_login_at is updated
   - Verify login_count is incremented
   - Verify failed_login_count is reset

### Integration Testing

**Manual Testing Steps**:

1. **Create Test User in Clerk**
   ```bash
   # Go to Clerk Dashboard
   # Create a new user manually
   # Check webhook logs
   # Verify user appears in Supabase
   ```

2. **Test User Profile Update**
   ```bash
   # Update user's first name in Clerk
   # Check webhook logs
   # Verify name is updated in Supabase
   ```

3. **Test User Deletion**
   ```bash
   # Delete user in Clerk
   # Check webhook logs
   # Verify user is soft deleted in Supabase
   # Verify deleted_at is set
   ```

4. **Test Organization Membership**
   ```bash
   # Add user to organization in Clerk
   # Check webhook logs
   # Verify clerk_org_id is updated in Supabase
   ```

5. **Test Webhook Retry**
   ```bash
   # Temporarily disable webhook endpoint
   # Trigger user creation in Clerk
   # Re-enable webhook endpoint
   # Verify retry succeeds
   ```

### Automated Testing with Clerk CLI

```bash
# Install Clerk CLI
pnpm add -g @clerk/clerk-cli

# Test webhook locally with ngrok
ngrok http 3000

# Update webhook URL in Clerk Dashboard to use ngrok URL

# Trigger test webhook
clerk webhook test user.created
```

### Database Verification Queries

```sql
-- Check if user was created
SELECT id, clerk_id, email, first_name, last_name, created_at
FROM users
WHERE clerk_id = 'clerk_user_id';

-- Check if user was updated
SELECT id, email, first_name, last_name, updated_at
FROM users
WHERE clerk_id = 'clerk_user_id';

-- Check if user was soft deleted
SELECT id, clerk_id, deleted_at, is_active
FROM users
WHERE clerk_id = 'clerk_user_id';

-- Check login tracking
SELECT id, last_login_at, login_count, failed_login_count
FROM users
WHERE clerk_id = 'clerk_user_id';

-- Check organization membership
SELECT id, clerk_id, clerk_org_id
FROM users
WHERE clerk_id = 'clerk_user_id';
```

## Error Handling and Retry Logic

### Clerk Webhook Retry Policy

Clerk automatically retries failed webhook deliveries with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 6 hours |
| 7 | 12 hours |
| 8 | 24 hours |

After 8 failed attempts, the webhook is marked as failed and no more retries are attempted.

### Idempotency Requirements

All webhook handlers must be idempotent to handle duplicate events:

```typescript
// Example: Idempotent user creation
if (eventType === "user.created") {
  const { id } = event.data;

  // Check if user already exists
  const existingUser = await getUserByClerkId(id);
  if (existingUser) {
    // User already exists, return success
    logger.info("User already exists, skipping creation", {
      clerkId: id,
      existingUserId: existingUser.id,
    });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Create user
  await createUser(db, { /* ... */ });
}
```

### Error Handling Strategy

**1. Validation Errors (400 Bad Request)**
```typescript
if (!svix_id || !svix_timestamp || !svix_signature) {
  logger.error("Missing Svix headers", new Error("Missing Svix headers"), {
    action: "webhook_verification",
  });
  return new Response("Error: Missing Svix headers", { status: 400 });
}
```

**2. Signature Verification Errors (400 Bad Request)**
```typescript
try {
  event = wh.verify(body, {
    "svix-id": svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature,
  }) as WebhookEvent;
} catch (err) {
  logger.error("Error verifying webhook", err as Error, {
    action: "webhook_verification",
  });
  return new Response("Error: Invalid signature", { status: 400 });
}
```

**3. User Not Found (404 Not Found)**
```typescript
const existingUser = await getUserByClerkId(id);
if (!existingUser) {
  logger.warn("User not found for update", {
    action: "user_updated",
    clerkId: id,
  });
  return new Response("Error: User not found", { status: 404 });
}
```

**4. Database Errors (500 Internal Server Error)**
```typescript
try {
  await createUser(db, { /* ... */ });
} catch (error) {
  logger.error("Failed to create user via webhook", error as Error, {
    action: "user_created",
    clerkId: id,
    email,
  });
  return new Response("Error: Failed to create user", { status: 500 });
}
```

### Transaction Handling

Use database transactions for complex operations:

```typescript
await db.transaction(async (tx) => {
  // Create user
  const user = await tx.insert(users).values(data).returning();

  // Create default permissions
  await tx.insert(userPermissions).values({
    userId: user[0].id,
    permissionId: defaultPermissionId,
  });

  // Create session record
  await tx.insert(userSessions).values({
    userId: user[0].id,
    sessionToken: generateToken(),
  });
});
```

### Monitoring and Alerting

**Key Metrics to Monitor**:
- Webhook success rate
- Webhook failure rate
- Average webhook processing time
- Number of retry attempts
- Database connection errors

**Alert Thresholds**:
- Webhook failure rate > 5% for 5 minutes
- Average processing time > 2 seconds
- Database connection errors > 10 per minute

## Edge Cases and Handling

### 1. Duplicate User Creation

**Scenario**: Clerk sends duplicate `user.created` events

**Solution**: Check if user exists before creating

```typescript
if (eventType === "user.created") {
  const { id } = event.data;

  // Check for existing user
  const existingUser = await getUserByClerkId(id);
  if (existingUser) {
    // Log and return success (idempotent)
    logger.info("User already exists, skipping creation", {
      clerkId: id,
      existingUserId: existingUser.id,
    });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Proceed with creation
  await createUser(db, { /* ... */ });
}
```

### 2. User Not Found on Update/Delete

**Scenario**: Clerk sends `user.updated` or `user.deleted` event, but user doesn't exist in Supabase

**Solution**: Return 404 and log warning

```typescript
const existingUser = await getUserByClerkId(id);
if (!existingUser) {
  logger.warn("User not found for update", {
    action: "user_updated",
    clerkId: id,
  });
  return new Response("Error: User not found", { status: 404 });
}
```

**Alternative**: Auto-create user if not found (if business logic allows)

```typescript
const existingUser = await getUserByClerkId(id);
if (!existingUser) {
  logger.info("User not found, creating from update event", {
    clerkId: id,
  });
  await createUser(db, { /* ... */ });
}
```

### 3. Missing Email Address

**Scenario**: User is created without email address

**Solution**: Use empty string or null, log warning

```typescript
const email = email_addresses[0]?.email_address ?? "";

if (!email) {
  logger.warn("User created without email address", {
    clerkId: id,
  });
}

await createUser(db, {
  clerkId: id,
  email,
  // ...
});
```

### 4. Multiple Email Addresses

**Scenario**: User has multiple email addresses

**Solution**: Use primary email address

```typescript
// Get primary email address
const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id);
const email = primaryEmail?.email_address ?? email_addresses[0]?.email_address ?? "";
```

### 5. Failed Database Connection

**Scenario**: Database is down during webhook processing

**Solution**: Return 500, let Clerk retry

```typescript
try {
  await createUser(db, { /* ... */ });
} catch (error) {
  if (error instanceof DatabaseConnectionError) {
    logger.error("Database connection failed", error as Error, {
      action: "user_created",
      clerkId: id,
    });
    // Return 500 to trigger retry
    return new Response("Error: Database connection failed", { status: 500 });
  }
  throw error;
}
```

### 6. Concurrent Webhook Events

**Scenario**: Multiple webhook events for same user arrive simultaneously

**Solution**: Use database transactions and optimistic locking

```typescript
await db.transaction(async (tx) => {
  // Lock user row for update
  const user = await tx
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .for('update')
    .limit(1);

  if (!user[0]) {
    throw new Error("User not found");
  }

  // Perform update
  await tx
    .update(users)
    .set({ /* ... */ })
    .where(eq(users.id, user[0].id));
});
```

### 7. Large Payload Handling

**Scenario**: Webhook payload is too large

**Solution**: Stream processing, validate size limits

```typescript
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const contentLength = headerPayload.get("content-length");
if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
  logger.error("Payload too large", new Error("Payload too large"), {
    contentLength,
  });
  return new Response("Error: Payload too large", { status: 413 });
}
```

### 8. Out-of-Order Events

**Scenario**: `user.updated` arrives before `user.created`

**Solution**: Handle gracefully, auto-create if needed

```typescript
if (eventType === "user.updated") {
  const existingUser = await getUserByClerkId(id);
  if (!existingUser) {
    // User doesn't exist, create it
    logger.info("User not found, creating from update event", {
      clerkId: id,
    });
    await createUser(db, {
      clerkId: id,
      email: email_addresses?.[0]?.email_address ?? "",
      firstName: first_name,
      lastName: last_name,
      imageUrl: image_url,
    });
  } else {
    // Update existing user
    await updateUser(db, existingUser.id, { /* ... */ });
  }
}
```

### 9. Webhook Replay

**Scenario**: Clerk replays old webhook events

**Solution**: Check timestamps, ignore stale events

```typescript
const eventTimestamp = new Date(event.data.created_at);
const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

if (eventTimestamp < staleThreshold) {
  logger.warn("Ignoring stale webhook event", {
    eventType,
    eventTimestamp,
    clerkId: event.data.id,
  });
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

### 10. Rate Limiting

**Scenario**: Too many webhook requests in short time

**Solution**: Implement rate limiting

```typescript
import { rateLimit } from "@/lib/rate-limit";

// In webhook handler
const { success } = await rateLimit({
  identifier: "webhook-" + eventType,
  limit: 100, // 100 requests per minute
  window: 60000, // 1 minute
});

if (!success) {
  logger.warn("Rate limit exceeded for webhook", {
    eventType,
  });
  return new Response("Error: Rate limit exceeded", { status: 429 });
}
```

## Monitoring and Alerting Setup

### Key Performance Indicators (KPIs)

**Webhook Metrics**:
- Success rate (target: >99%)
- Failure rate (alert if >5% for 5 minutes)
- Average processing time (target: <500ms)
- P95 processing time (target: <2s)
- P99 processing time (target: <5s)
- Retry rate (alert if >1%)
- Events per minute

**Database Metrics**:
- Connection pool utilization (alert if >80%)
- Query execution time (alert if >1s)
- Transaction failures (alert if >0.1%)
- Deadlocks (alert if any)

**Application Metrics**:
- Error rate (alert if >1%)
- Memory usage (alert if >80%)
- CPU usage (alert if >80%)
- Response time (alert if >2s)

### Logging Strategy

**Structured Logging**:
```typescript
logger.info("Webhook event received", {
  action: "webhook_received",
  eventType,
  eventId: event.data.id,
  clerkUserId: event.data.id,
  timestamp: new Date().toISOString(),
});
```

**Log Levels**:
- `error`: Failures that require immediate attention
- `warn`: Unexpected but recoverable situations
- `info`: Normal operations (webhook received, user created)
- `debug`: Detailed debugging information

**Log Fields**:
```typescript
{
  timestamp: string,        // ISO 8601
  level: string,            // error, warn, info, debug
  action: string,           // webhook_received, user_created, etc.
  eventType: string,        // user.created, user.updated, etc.
  eventId: string,          // Clerk event ID
  clerkUserId: string,      // Clerk user ID
  internalUserId: string,   // Supabase user ID
  duration: number,         // Processing time in ms
  error: string,            // Error message if applicable
  stack: string,            // Stack trace for errors
}
```

### Alerting Configuration

**Critical Alerts** (Page immediately):
- Webhook failure rate >10% for 2 minutes
- Database connection failures >5 per minute
- Application error rate >5% for 2 minutes
- Security-related errors (signature verification failures)

**Warning Alerts** (Email within 15 minutes):
- Webhook failure rate >5% for 5 minutes
- Average processing time >2s for 10 minutes
- Database query time >1s for 5 minutes
- Retry rate >2% for 10 minutes

**Info Alerts** (Daily digest):
- Webhook statistics summary
- User creation trends
- Performance metrics summary

### Monitoring Tools Integration

**Prometheus Metrics**:
```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Webhook event counter
const webhookEventsCounter = new Counter({
  name: 'clerk_webhook_events_total',
  help: 'Total number of webhook events received',
  labelNames: ['event_type', 'status'],
});

// Webhook processing time histogram
const webhookProcessingTime = new Histogram({
  name: 'clerk_webhook_processing_duration_seconds',
  help: 'Webhook processing time in seconds',
  labelNames: ['event_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Active database connections gauge
const dbConnectionsGauge = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
});

// Usage in webhook handler
webhookEventsCounter.inc({ event_type: eventType, status: 'success' });
webhookProcessingTime.observe({ event_type: eventType }, duration / 1000);
```

**Health Check Endpoints**:
```typescript
// GET /api/health/webhooks
export async function GET() {
  const stats = {
    totalEvents: await getWebhookEventCount(),
    successRate: await getWebhookSuccessRate(),
    avgProcessingTime: await getAvgProcessingTime(),
    lastEventTime: await getLastEventTime(),
  };

  return Response.json(stats);
}
```

### Dashboard Configuration

**Key Dashboard Panels**:

1. **Webhook Overview**
   - Events per minute (line chart)
   - Success rate (gauge)
   - Average processing time (line chart)
   - Events by type (pie chart)

2. **Error Analysis**
   - Error rate over time (line chart)
   - Error types (bar chart)
   - Failed events table

3. **Database Performance**
   - Connection pool usage (gauge)
   - Query execution time (line chart)
   - Transaction failures (line chart)

4. **User Sync Status**
   - Total users synced (counter)
   - Sync failures (counter)
   - Users by status (pie chart)

## Performance Optimization Guidelines

### Database Optimization

**Connection Pooling**:
```typescript
// Optimize connection pool size
const conn = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 20,              // Maximum connections
  idle_timeout: 20,     // Idle timeout in seconds
  connect_timeout: 10,  // Connection timeout in seconds
});
```

**Query Optimization**:
```typescript
// Use indexed columns for lookups
await db
  .select()
  .from(users)
  .where(eq(users.clerkId, clerkId))  // clerk_id has unique index
  .limit(1);

// Select only needed columns
await db
  .select({
    id: users.id,
    clerkId: users.clerkId,
    email: users.email,
  })
  .from(users)
  .where(eq(users.clerkId, clerkId));
```

**Batch Operations**:
```typescript
// For bulk operations, use batch inserts
await db.insert(users).values([
  { clerkId: 'user_1', email: 'user1@example.com' },
  { clerkId: 'user_2', email: 'user2@example.com' },
  { clerkId: 'user_3', email: 'user3@example.com' },
]);
```

### Webhook Processing Optimization

**Async Processing**:
```typescript
// For non-critical operations, use background jobs
if (eventType === "user.created") {
  // Critical: Create user synchronously
  await createUser(db, userData);

  // Non-critical: Send welcome email asynchronously
  sendWelcomeEmail(email).catch((error) => {
    logger.error("Failed to send welcome email", error, { email });
  });
}
```

**Caching**:
```typescript
// Cache frequently accessed user data
import { cache } from '@/lib/cache';

async function getCachedUser(clerkId: string) {
  return cache.get(`user:${clerkId}`, async () => {
    return getUserByClerkId(clerkId);
  }, { ttl: 300 }); // Cache for 5 minutes
}
```

**Payload Validation**:
```typescript
// Validate payload size before processing
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const contentLength = headerPayload.get("content-length");

if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
  return new Response("Error: Payload too large", { status: 413 });
}
```

### Response Time Optimization

**Early Returns**:
```typescript
// Return early for idempotent operations
if (eventType === "user.created") {
  const existingUser = await getUserByClerkId(id);
  if (existingUser) {
    // Early return - no need to process further
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
  // Continue with creation...
}
```

**Parallel Processing**:
```typescript
// Process independent operations in parallel
await Promise.all([
  updateUser(db, userId, userData),
  updateOrganizationMembership(db, userId, orgId),
  recordActivityLog(db, userId, 'user_updated'),
]);
```

### Memory Optimization

**Stream Processing**:
```typescript
// For large payloads, use streaming
import { Readable } from 'stream';

async function* parseWebhookPayload(body: ReadableStream) {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    yield JSON.parse(chunk);
  }
}
```

**Garbage Collection**:
```typescript
// Avoid memory leaks by cleaning up references
function processWebhook(event: WebhookEvent) {
  const data = { ...event.data };  // Create copy

  // Process data...
  processUserData(data);

  // Clear references
  data.email_addresses = null;
  data.public_metadata = null;
  data.private_metadata = null;
}
```

### CDN and Edge Optimization

**Edge Function Deployment**:
```typescript
// Deploy webhook handler to edge for lower latency
// Using Vercel Edge Runtime or Cloudflare Workers
export const runtime = 'edge';

export async function POST(req: Request) {
  // Webhook processing logic
}
```

**Geographic Distribution**:
```typescript
// Use regional endpoints for better performance
const region = req.headers.get('cf-ipcountry');
const dbConnection = getRegionalDatabaseConnection(region);
```

## Security Best Practices

### Webhook Security

**Signature Verification**:
```typescript
// Always verify webhook signatures
const wh = new Webhook(env.CLERK_WEBHOOK_SECRET ?? "");

try {
  event = wh.verify(body, {
    "svix-id": svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature,
  }) as WebhookEvent;
} catch (err) {
  logger.error("Invalid webhook signature", err, {
    ip: req.headers.get('cf-connecting-ip'),
  });
  return new Response("Error: Invalid signature", { status: 400 });
}
```

**Timestamp Validation**:
```typescript
// Reject stale webhooks to prevent replay attacks
const timestamp = parseInt(svix_timestamp);
const now = Math.floor(Date.now() / 1000);
const maxAge = 5 * 60; // 5 minutes

if (now - timestamp > maxAge) {
  logger.error("Webhook timestamp too old", null, {
    timestamp,
    now,
    age: now - timestamp,
  });
  return new Response("Error: Timestamp too old", { status: 400 });
}
```

**IP Whitelisting**:
```typescript
// Whitelist Clerk webhook IPs
const CLERK_WEBHOOK_IPS = [
  '107.23.151.0/24',
  '54.88.237.0/24',
  // Add all Clerk webhook IPs
];

const clientIp = req.headers.get('cf-connecting-ip');
if (!isIpWhitelisted(clientIp, CLERK_WEBHOOK_IPS)) {
  logger.error("Unauthorized IP attempting webhook", null, { clientIp });
  return new Response("Error: Unauthorized", { status: 403 });
}
```

### Data Security

**Input Sanitization**:
```typescript
import { z } from 'zod';

// Validate and sanitize input
const userSchema = z.object({
  id: z.string().min(1),
  email_addresses: z.array(z.object({
    email_address: z.string().email(),
    id: z.string(),
  })),
  first_name: z.string().max(255).nullable(),
  last_name: z.string().max(255).nullable(),
  image_url: z.string().url().nullable(),
});

const validatedData = userSchema.parse(event.data);
```

**SQL Injection Prevention**:
```typescript
// Use parameterized queries (Drizzle ORM handles this automatically)
await db
  .select()
  .from(users)
  .where(eq(users.clerkId, clerkId));  // Safe - parameterized
```

**Sensitive Data Logging**:
```typescript
// Never log sensitive data
logger.info("User created", {
  clerkId: id,
  email: email,  // OK to log email
  // Never log: passwords, tokens, API keys, etc.
});

// Use redaction for sensitive fields
function redactSensitiveData(data: any): any {
  const redacted = { ...data };
  if (redacted.password) redacted.password = '***';
  if (redacted.apiKey) redacted.apiKey = '***';
  return redacted;
}
```

### API Security

**Rate Limiting**:
```typescript
// Implement rate limiting per IP
import { rateLimit } from '@/lib/rate-limit';

const { success } = await rateLimit({
  identifier: req.headers.get('cf-connecting-ip') ?? 'unknown',
  limit: 100,  // 100 requests per minute
  window: 60000,  // 1 minute
});

if (!success) {
  logger.warn("Rate limit exceeded", { ip: req.headers.get('cf-connecting-ip') });
  return new Response("Error: Rate limit exceeded", { status: 429 });
}
```

**Request Size Limits**:
```typescript
// Limit request size to prevent DoS attacks
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

const contentLength = req.headers.get('content-length');
if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
  logger.error("Request too large", null, { contentLength });
  return new Response("Error: Request too large", { status: 413 });
}
```

**CORS Configuration**:
```typescript
// Restrict CORS to trusted origins
export async function OPTIONS(req: Request) {
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
  ];

  const origin = req.headers.get('origin');
  if (!allowedOrigins.includes(origin ?? '')) {
    return new Response("Error: Origin not allowed", { status: 403 });
  }

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, svix-id, svix-timestamp, svix-signature',
    },
  });
}
```

### Database Security

**Row Level Security (RLS)**:
```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (clerk_id = auth.uid());

CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (clerk_id = auth.uid());
```

**Connection Security**:
```typescript
// Use SSL for database connections
const conn = postgres(env.DATABASE_URL, {
  ssl: 'require',  // Enforce SSL
  prepare: false,
});
```

**Least Privilege Principle**:
```sql
-- Create role with limited permissions
CREATE ROLE webhook_handler WITH LOGIN PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT INSERT, UPDATE, SELECT ON users TO webhook_handler;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO webhook_handler;
```

### Environment Security

**Secret Management**:
```typescript
// Never hardcode secrets
// Always use environment variables
import { env } from '@/config/env';

// Validate environment variables at startup
if (!env.CLERK_WEBHOOK_SECRET) {
  throw new Error('CLERK_WEBHOOK_SECRET is required');
}
```

**Secret Rotation**:
```typescript
// Support multiple webhook secrets for rotation
const WEBHOOK_SECRETS = [
  env.CLERK_WEBHOOK_SECRET,
  env.CLERK_WEBHOOK_SECRET_V2,  // New secret
  env.CLERK_WEBHOOK_SECRET_V3,  // Newer secret
];

// Try all secrets until one works
let event: WebhookEvent;
for (const secret of WEBHOOK_SECRETS) {
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    break;
  } catch (err) {
    // Try next secret
  }
}
```

**Audit Logging**:
```typescript
// Log all security-relevant events
logger.info("Security event", {
  action: 'webhook_received',
  eventType,
  clerkUserId: event.data.id,
  ip: req.headers.get('cf-connecting-ip'),
  userAgent: req.headers.get('user-agent'),
  timestamp: new Date().toISOString(),
});
```

### Compliance Considerations

**GDPR Compliance**:
```typescript
// Handle user data deletion requests
if (eventType === "user.deleted") {
  // Soft delete user
  await deactivateUser(db, userId);

  // Log deletion for audit trail
  logger.info("User deleted (GDPR)", {
    clerkId: id,
    internalId: userId,
    timestamp: new Date().toISOString(),
  });
}
```

**Data Retention**:
```typescript
// Implement data retention policies
async function cleanupOldUsers() {
  const retentionDays = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(
      and(
        lt(users.deletedAt, cutoffDate),
        isNull(users.deletedAt)
      )
    );
}
```

**Audit Trail**:
```typescript
// Maintain audit trail for all user changes
await db.insert(auditLogs).values({
  userId: user.id,
  action: 'user_created',
  changes: JSON.stringify({ before: null, after: user }),
  ipAddress: req.headers.get('cf-connecting-ip'),
  userAgent: req.headers.get('user-agent'),
  timestamp: new Date(),
});
```

## Maintenance and Operations

### Daily Operations

**Daily Checklist**:

- [ ] Review webhook error logs
- [ ] Check webhook success rate (>99% target)
- [ ] Monitor database connection pool usage
- [ ] Review failed webhook attempts
- [ ] Check for rate limit warnings
- [ ] Verify new user creation rate
- [ ] Review security alerts

**Daily Reports**:

Generate daily summary:

```sql
-- Daily webhook statistics
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_users,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_users,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY DATE(created_at);
```

### Weekly Operations

**Weekly Checklist**:

- [ ] Review webhook performance trends
- [ ] Analyze failed webhook patterns
- [ ] Check database query performance
- [ ] Review user growth metrics
- [ ] Audit webhook configuration changes
- [ ] Review and rotate secrets if needed
- [ ] Test backup and restore procedures
- [ ] Review and update documentation

**Weekly Reports**:

```sql
-- Weekly user activity
SELECT
  DATE_TRUNC('week', last_login_at) as week,
  COUNT(*) as active_users,
  AVG(login_count) as avg_logins,
  MAX(login_count) as max_logins
FROM users
WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days'
  AND deleted_at IS NULL
GROUP BY DATE_TRUNC('week', last_login_at);
```

### Monthly Operations

**Monthly Checklist**:

- [ ] Review and update webhook secrets
- [ ] Audit user data retention policies
- [ ] Review and optimize database indexes
- [ ] Analyze long-term trends
- [ ] Review compliance requirements
- [ ] Update runbooks and documentation
- [ ] Review and update alerting thresholds
- [ ] Capacity planning review

**Monthly Reports**:

```sql
-- Monthly user growth
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_users,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as retained_users,
  ROUND(COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as retention_rate
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('month', created_at);
```

### Database Maintenance

**Index Maintenance**:

```sql
-- Analyze table for query optimization
ANALYZE users;

-- Reindex if fragmentation is high
REINDEX TABLE users;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'users';
```

**Vacuum and Analyze**:

```sql
-- Vacuum to reclaim space
VACUUM ANALYZE users;

-- Full vacuum for maintenance window
VACUUM FULL ANALYZE users;
```

**Data Retention**:

```sql
-- Soft delete old inactive users (90 days)
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP,
    is_active = false
WHERE last_login_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
  AND deleted_at IS NULL;

-- Archive deleted users older than 1 year
-- Move to archive table or export to cold storage
```

### Backup Strategy

**Automated Backups**:

```bash
# Daily database backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Upload to S3 or other storage
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://backups/database/

# Retention policy: Keep 30 daily, 12 monthly, 5 yearly
```

**Backup Verification**:

```bash
# Verify backup integrity
gunzip -c backup_$(date +%Y%m%d).sql.gz | psql -d test_database

# Test restore procedure
pg_restore -d test_database backup_$(date +%Y%m%d).sql
```

**Disaster Recovery**:

1. **Identify Failure**:
   - Database down
   - Webhook endpoint unavailable
   - Data corruption

2. **Assess Impact**:
   - Number of affected users
   - Data loss estimation
   - Recovery time objective (RTO)

3. **Execute Recovery**:
   ```bash
   # Restore from backup
   pg_restore -d $DATABASE_URL backup_latest.sql

   # Verify data integrity
   psql -d $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

4. **Post-Recovery**:
   - Verify webhook processing resumes
   - Check for missed events
   - Monitor for errors
   - Document incident

### Performance Tuning

**Query Optimization**:

```sql
-- Identify slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%users%'
ORDER BY mean_time DESC
LIMIT 10;
```

**Connection Pool Tuning**:

```typescript
// Adjust connection pool based on load
const conn = postgres(env.DATABASE_URL, {
  prepare: false,
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

**Caching Strategy**:

```typescript
// Implement Redis caching for frequent queries
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache user lookups
async function getUserWithCache(clerkId: string) {
  const cacheKey = `user:${clerkId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const user = await getUserByClerkId(clerkId);
  await redis.setex(cacheKey, 300, JSON.stringify(user)); // 5 minutes

  return user;
}
```

### Monitoring and Alerting

**Dashboard Review**:

- Webhook success rate
- Average processing time
- Error rate by type
- Database performance
- System resource usage

**Alert Response Procedure**:

1. **Receive Alert**:
   - Acknowledge alert
   - Assess severity
   - Determine impact

2. **Investigate**:
   - Check logs for errors
   - Review metrics
   - Identify root cause

3. **Resolve**:
   - Apply fix
   - Verify resolution
   - Monitor for recurrence

4. **Document**:
   - Create incident report
   - Update runbook
   - Share lessons learned

### Security Maintenance

**Secret Rotation**:

```bash
# Rotate Clerk webhook secret
# 1. Generate new secret in Clerk Dashboard
# 2. Update application with new secret
# 3. Test webhook with new secret
# 4. Remove old secret after 24 hours

# Rotate database credentials
# 1. Generate new password in Supabase Dashboard
# 2. Update DATABASE_URL
# 3. Test connection
# 4. Remove old credentials
```

**Security Audit**:

```sql
-- Check for unusual activity
SELECT
  clerk_id,
  login_count,
  failed_login_count,
  last_login_at,
  CASE
    WHEN failed_login_count > 10 THEN 'Review Required'
    ELSE 'Normal'
  END as status
FROM users
WHERE failed_login_count > 5
  OR last_login_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

**Access Review**:

- Review database access logs
- Audit webhook endpoint access
- Review API key usage
- Verify IP whitelist is current

### Capacity Planning

**Growth Projections**:

```sql
-- User growth trend
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_users,
  LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as previous_month,
  ROUND((COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at))) * 100.0 /
    NULLIF(LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)), 0), 2) as growth_rate
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

**Resource Scaling**:

- Monitor database connection pool usage
- Track webhook processing time
- Review storage requirements
- Plan for peak traffic periods

**Scaling Triggers**:

| Metric | Threshold | Action |
|---------|-----------|--------|
| Webhook processing time | >2s for 10 min | Scale up |
| Database connection pool | >80% for 5 min | Increase pool size |
| Error rate | >5% for 5 min | Investigate |
| Storage usage | >80% | Plan expansion |

### Incident Management

**Incident Response Process**:

1. **Detection**:
   - Automated alert
   - User report
   - Manual discovery

2. **Triage**:
   - Assess severity (P1, P2, P3, P4)
   - Determine impact
   - Assign priority

3. **Response**:
   - P1 (Critical): Immediate response, page on-call
   - P2 (High): Response within 15 minutes
   - P3 (Medium): Response within 1 hour
   - P4 (Low): Response within 4 hours

4. **Resolution**:
   - Implement fix
   - Verify resolution
   - Monitor for recurrence

5. **Post-Incident**:
   - Create incident report
   - Conduct post-mortem
   - Update documentation

**Incident Report Template**:

```markdown
# Incident Report

## Summary
- **Date**: [YYYY-MM-DD]
- **Time**: [HH:MM:SS]
- **Severity**: [P1/P2/P3/P4]
- **Duration**: [X hours]

## Impact
- **Affected Users**: [Number]
- **Affected Services**: [List]
- **Business Impact**: [Description]

## Root Cause
- **Primary Cause**: [Description]
- **Contributing Factors**: [List]

## Timeline
- [Time]: [Event]
- [Time]: [Event]

## Resolution
- **Actions Taken**: [List]
- **Verification**: [Steps]

## Prevention
- **Immediate Actions**: [List]
- **Long-term Actions**: [List]

## Lessons Learned
- [What went well]
- [What could be improved]
```

### Runbook

**Common Scenarios**:

**Scenario 1: Webhook Endpoint Down**

1. Check application logs
2. Verify server is running
3. Check load balancer health
4. Restart service if needed
5. Monitor for recovery

**Scenario 2: Database Connection Issues**

1. Check Supabase status page
2. Verify DATABASE_URL is correct
3. Test database connection
4. Check connection pool usage
5. Restart application if needed

**Scenario 3: High Error Rate**

1. Identify error type from logs
2. Check for recent deployments
3. Review webhook payload changes
4. Check Clerk status
5. Rollback if necessary

**Scenario 4: Performance Degradation**

1. Check system resources
2. Review database query performance
3. Check for long-running queries
4. Review webhook processing time
5. Scale resources if needed

### Documentation Updates

**Keep Documentation Current**:

- Update runbooks after incidents
- Document new procedures
- Update architecture diagrams
- Maintain API documentation
- Review and update weekly

**Knowledge Base**:

- Create articles for common issues
- Document troubleshooting steps
- Share lessons learned
- Maintain FAQ

## Success Criteria

- [ ] User created in Clerk automatically appears in Supabase
- [ ] User profile updates in Clerk sync to Supabase
- [ ] User deletion in Clerk triggers soft delete in Supabase
- [ ] clerk_id is correctly stored in Supabase
- [ ] All webhook events are logged
- [ ] Error handling returns appropriate status codes
- [ ] Organization memberships sync correctly
- [ ] Session events are tracked
- [ ] Webhook handlers are idempotent
- [ ] Duplicate events are handled gracefully
- [ ] Failed syncs trigger appropriate retries
- [ ] Edge cases are tested and documented
- [ ] Unit tests cover all webhook events
- [ ] Integration tests verify end-to-end flow
- [ ] Monitoring and alerting are configured
- [ ] Rate limiting is implemented
- [ ] Database transactions are used for complex operations
- [ ] Performance metrics are tracked
- [ ] Security best practices are implemented
- [ ] Audit logging is enabled
- [ ] Webhook signatures are verified
- [ ] Input validation is in place
- [ ] Rate limiting is configured
- [ ] Secrets are properly managed
- [ ] Compliance requirements are met
- [ ] Daily operations checklist is in place
- [ ] Backup and recovery procedures are documented
- [ ] Incident response process is established
- [ ] Runbooks are maintained and updated
- [ ] Capacity planning is performed regularly
- [ ] Documentation is kept current
