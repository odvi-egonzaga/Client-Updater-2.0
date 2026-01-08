# Client Updater Version 2 - Clerk Authentication

## Overview

The Client Updater Version 2 uses [Clerk](https://clerk.com/) as the authentication and user management solution. Clerk provides a complete authentication system with built-in UI components, organization management, and webhook support for synchronizing user data with your local database.

### Why Clerk?

- **Complete Auth Solution**: Sign-in, sign-up, password reset, email verification, MFA
- **Built-in Components**: Pre-built, customizable auth UI components
- **Organization Support**: Multi-tenant architecture out of the box
- **Webhooks**: Real-time user data synchronization
- **Type Safety**: Full TypeScript support
- **Security**: SOC 2 Type II compliant, GDPR ready

---

## Clerk Integration Setup

### 1. Create a Clerk Account

1. Go to [clerk.com](https://clerk.com/) and sign up
2. Create a new application
3. Note down your API keys from the dashboard

### 2. Install Clerk Dependencies

```bash
pnpm add @clerk/nextjs
```

### 3. Configure Environment Variables

Add the following to your [`.env`](../environment-variables.md) file:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/health
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/health
```

**Where to find these keys:**

- **Publishable Key**: Clerk Dashboard → Your App → API Keys → Publishable Key
- **Secret Key**: Clerk Dashboard → Your App → API Keys → Secret Key
- **Webhook Secret**: Clerk Dashboard → Your App → Webhooks → Add Endpoint → Copy Secret

### 4. Configure Environment Validation

Update [`src/config/env.ts`](../../src/config/env.ts) to validate Clerk environment variables:

```typescript
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    // ... other variables
    CLERK_SECRET_KEY: z.string().startsWith('sk_'),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/health'),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/health'),
  },
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  },
})
```

---

## User Authentication Flow

### Authentication Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│ Clerk UI    │────▶│ Clerk API   │────▶│  Session    │
│   Browser   │     │ Components  │     │  Server     │     │  Created    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                        │
                           │                                        ▼
                           │                              ┌─────────────┐
                           │                              │   Clerk     │
                           │                              │  Webhook    │
                           │                              └─────────────┘
                           │                                        │
                           ▼                                        ▼
                   ┌─────────────┐                          ┌─────────────┐
                   │   Redirect  │                          │   Local DB   │
                   │  to App     │                          │   Updated   │
                   └─────────────┘                          └─────────────┘
```

### Sign-In Flow

1. User navigates to `/sign-in`
2. Clerk `<SignIn />` component renders
3. User enters credentials
4. Clerk validates credentials
5. Clerk creates session and stores tokens
6. User is redirected to `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`

### Sign-Up Flow

1. User navigates to `/sign-up`
2. Clerk `<SignUp />` component renders
3. User enters registration details
4. Clerk validates and creates user account
5. Clerk triggers `user.created` webhook
6. Webhook handler creates user in local database
7. User is redirected to `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

---

## Organization Management

### Clerk Organizations

Clerk provides built-in organization management for multi-tenant applications. Organizations allow you to group users and manage permissions at the organization level.

### Organization Features

- **Multi-Tenancy**: Separate data per organization
- **Organization Roles**: Admin, Member, etc.
- **Organization Memberships**: Users can belong to multiple organizations
- **Organization Webhooks**: Sync organization membership changes

### Organization Schema

The local database schema includes organization tracking:

```typescript
// src/server/db/schema/users.ts
export const users = pgTable('users', {
  id: text('id').primaryKey(),                    // Clerk user ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  imageUrl: text('image_url'),
  clerkOrgId: text('clerk_org_id'),                // Clerk organization ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Accessing Organization Data

**Server-Side:**

```typescript
import { getAuth } from '@clerk/nextjs/server'

export async function getServerData() {
  const auth = getAuth()
  
  return {
    userId: auth.userId,
    orgId: auth.orgId,
    orgRole: auth.orgRole,
  }
}
```

**Client-Side:**

```typescript
import { useAuth } from '@clerk/nextjs'

export function MyComponent() {
  const { orgId, orgRole } = useAuth()
  
  return <div>Organization: {orgId}, Role: {orgRole}</div>
}
```

---

## Webhook Synchronization

### Webhook Setup

1. Go to Clerk Dashboard → Your App → Webhooks
2. Add a new endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events to listen for:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
4. Copy the webhook secret to your `.env` file

### Webhook Handler

The webhook handler is located at [`src/app/api/webhooks/clerk/route.ts`](../../src/app/api/webhooks/clerk/route.ts):

```typescript
import type { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { env } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema/users'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    // Get headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // Verify headers
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error: Missing Svix headers', { status: 400 })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Verify webhook signature
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET ?? '')
    let event: WebhookEvent

    try {
      event = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return new Response('Error: Invalid signature', { status: 400 })
    }

    // Handle events
    const eventType = event.type

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      await db.insert(users).values({
        id,
        email: email_addresses[0]?.email_address ?? '',
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        imageUrl: image_url ?? null,
      })

      console.log(`User created: ${id}`)
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      if (id) {
        await db
          .update(users)
          .set({
            email: email_addresses?.[0]?.email_address,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))

        console.log(`User updated: ${id}`)
      }
    }

    if (eventType === 'user.deleted') {
      const { id } = event.data

      if (id) {
        await db.delete(users).where(eq(users.id, id))

        console.log(`User deleted: ${id}`)
      }
    }

    if (eventType === 'organizationMembership.created' || 
        eventType === 'organizationMembership.updated') {
      const data = event.data as any
      const userId = data.public_user_data
      const orgId = data.organization

      if (userId) {
        await db
          .update(users)
          .set({
            clerkOrgId: orgId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))

        console.log(`Organization membership updated for user: ${userId}, org: ${orgId}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error: Webhook processing failed', { status: 500 })
  }
}
```

### Supported Webhook Events

| Event | Description | Handler Action |
|-------|-------------|-----------------|
| `user.created` | New user registered | Insert user into local database |
| `user.updated` | User profile updated | Update user in local database |
| `user.deleted` | User account deleted | Delete user from local database |
| `organizationMembership.created` | User joined organization | Update user's organization ID |
| `organizationMembership.updated` | Organization membership changed | Update user's organization ID |

---

## Protected Routes Configuration

### Middleware Setup

The middleware is located at [`src/middleware.ts`](../../src/middleware.ts):

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/ping',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Public Routes

The following routes are public (no authentication required):

- `/sign-in` - Sign-in page
- `/sign-up` - Sign-up page
- `/api/webhooks/*` - Webhook endpoints
- `/api/ping` - Health check ping endpoint

### Protected Routes

All other routes require authentication. If a user tries to access a protected route without being authenticated, they will be redirected to the sign-in page.

### Adding Public Routes

To add a new public route, add it to the `isPublicRoute` matcher:

```typescript
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/ping',
  '/your-new-public-route(.*)', // Add new public route here
])
```

---

## Clerk Components Usage

### Sign-In Component

Located at [`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`](../../src/app/(auth)/sign-in/[[...sign-in]]/page.tsx):

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

### Sign-Up Component

Located at [`src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`](../../src/app/(auth)/sign-up/[[...sign-up]]/page.tsx):

```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
```

### User Button Component

Used in the dashboard layout to show user menu:

```typescript
import { UserButton } from '@clerk/nextjs'

export function Navbar() {
  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/health" className="font-semibold">Client Updater Version 2</Link>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  )
}
```

### SignedIn and SignedOut Components

Conditionally render content based on authentication status:

```typescript
import { SignedIn, SignedOut } from '@clerk/nextjs'

export function MyComponent() {
  return (
    <div>
      <SignedIn>
        <p>You are signed in!</p>
      </SignedIn>
      <SignedOut>
        <p>You are signed out!</p>
      </SignedOut>
    </div>
  )
}
```

### Using Clerk Hooks

**useAuth Hook:**

```typescript
import { useAuth } from '@clerk/nextjs'

export function MyComponent() {
  const { userId, isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!isSignedIn) {
    return <div>Not signed in</div>
  }

  return <div>User ID: {userId}</div>
}
```

**useUser Hook:**

```typescript
import { useUser } from '@clerk/nextjs'

export function UserProfile() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>Name: {user?.fullName}</p>
      <p>Email: {user?.primaryEmailAddress?.emailAddress}</p>
    </div>
  )
}
```

---

## Server-Side Authentication

### Getting Auth Context

```typescript
import { getAuth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = getAuth(request)
  
  if (!auth.userId) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  return Response.json({ userId: auth.userId })
}
```

### In API Routes (Hono)

```typescript
import { getAuth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'

export const myRoute = new Hono()

myRoute.get('/protected', async (c) => {
  const auth = getAuth(c.req.raw as NextRequest)
  
  if (!auth.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  return c.json({ userId: auth.userId })
})
```

### In Server Components

```typescript
import { getAuth } from '@clerk/nextjs/server'

export default async function ServerComponent() {
  const auth = getAuth()
  
  if (!auth.userId) {
    redirect('/sign-in')
  }
  
  return <div>Welcome, {auth.userId}</div>
}
```

---

## Clerk Health Checks

The framework includes health check endpoints for verifying Clerk integration:

### Health Check Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health/clerk/user` | GET | Get current user |
| `/api/health/clerk/org` | GET | Get organization membership |
| `/api/health/clerk/members` | GET | List organization members |

### Example Response

```json
{
  "status": "healthy",
  "responseTimeMs": 45,
  "message": "Successfully retrieved current user",
  "data": {
    "userId": "user_abc123",
    "hasOrg": true
  }
}
```

---

## Security Considerations

### Best Practices

1. **Never expose secret keys**: Only use `NEXT_PUBLIC_` prefixed keys in client code
2. **Verify webhook signatures**: Always verify webhook signatures to prevent spoofing
3. **Use environment variables**: Store all sensitive data in environment variables
4. **Enable MFA**: Require multi-factor authentication for sensitive operations
5. **Monitor webhook failures**: Set up alerts for failed webhook deliveries

### Session Management

- Clerk handles session management automatically
- Sessions are stored in secure HTTP-only cookies
- Session tokens are automatically refreshed
- Sessions can be revoked from the Clerk dashboard

---

## Troubleshooting

### Common Issues

**Issue: Webhook signature verification fails**

- Verify the `CLERK_WEBHOOK_SECRET` is correct
- Check that the webhook endpoint URL is correct
- Ensure the webhook is enabled in Clerk dashboard

**Issue: User not redirected after sign-in**

- Check `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` environment variable
- Verify middleware configuration
- Check browser console for errors

**Issue: Organization ID not syncing**

- Verify organization webhooks are enabled
- Check webhook logs in Clerk dashboard
- Ensure `organizationMembership.created` event is selected

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Clerk environment variables
- [API Layer](./api-layer.md) - API authentication middleware
- [Health Check System](./health-check-system.md) - Health check endpoints
- [Supabase Integration](./supabase-integration.md) - Database schema for users
