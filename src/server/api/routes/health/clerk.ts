import { Hono } from 'hono'
import { getAuth, clerkClient } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'

export const clerkHealthRoutes = new Hono()

clerkHealthRoutes.get('/env', async (c) => {
  const start = performance.now()
  const secretKey = process.env.CLERK_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (secretKey && publishableKey) {
    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Clerk environment variables are configured',
      data: {
        hasSecretKey: true,
        hasPublishableKey: true,
      },
    })
  }

  return c.json(
    {
      status: 'error',
      responseTimeMs: Math.round(performance.now() - start),
      error: 'Missing Clerk environment variables',
      data: {
        hasSecretKey: !!secretKey,
        hasPublishableKey: !!publishableKey,
      },
    },
    500
  )
})

clerkHealthRoutes.get('/api-status', async (c) => {
  const start = performance.now()
  try {
    const client = await clerkClient()
    const count = await client.users.getCount()
    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully connected to Clerk Backend API',
      data: { userCount: count },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to connect to Clerk Backend API',
      },
      500
    )
  }
})

clerkHealthRoutes.get('/user', async (c) => {
  const start = performance.now()

  try {
    const auth = getAuth(c.req.raw as NextRequest)

    if (!auth.userId) {
      return c.json(
        {
          status: 'error',
          responseTimeMs: Math.round(performance.now() - start),
          error: 'No authenticated user found',
        },
        401
      )
    }

    const client = await clerkClient()
    const user = await client.users.getUser(auth.userId)

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully retrieved current user',
      data: {
        userId: auth.userId,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        hasOrg: !!auth.orgId,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to get user',
      },
      500
    )
  }
})

// Session route removed


clerkHealthRoutes.get('/org', async (c) => {
  const start = performance.now()

  try {
    const auth = getAuth(c.req.raw as NextRequest)

    if (!auth.userId) {
      return c.json(
        {
          status: 'error',
          responseTimeMs: Math.round(performance.now() - start),
          error: 'No authenticated user found',
        },
        401
      )
    }

    if (!auth.orgId) {
      return c.json({
        status: 'healthy',
        responseTimeMs: Math.round(performance.now() - start),
        message: 'User is not a member of any organization',
        data: { orgId: null },
      })
    }

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully retrieved organization membership',
      data: {
        orgId: auth.orgId,
        orgRole: auth.orgRole,
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to get organization',
      },
      500
    )
  }
})

clerkHealthRoutes.get('/members', async (c) => {
  const start = performance.now()

  try {
    const auth = getAuth(c.req.raw as NextRequest)

    if (!auth.userId) {
      return c.json(
        {
          status: 'error',
          responseTimeMs: Math.round(performance.now() - start),
          error: 'No authenticated user found',
        },
        401
      )
    }

    if (!auth.orgId) {
      return c.json({
        status: 'healthy',
        responseTimeMs: Math.round(performance.now() - start),
        message: 'User is not a member of any organization',
        data: { members: [] },
      })
    }

    // Note: In a real implementation, you would use Clerk's Backend API to fetch org members
    // This is a simplified check that verifies org membership exists
    const client = await clerkClient()
    const members = await client.organizations.getOrganizationMembershipList({ organizationId: auth.orgId })

    return c.json({
      status: 'healthy',
      responseTimeMs: Math.round(performance.now() - start),
      message: 'Successfully verified organization membership',
      data: {
        orgId: auth.orgId,
        orgRole: auth.orgRole,
        count: members.totalCount,
        members: members.data.map((m) => ({
          id: m.id,
          userId: m.publicUserData?.userId,
          role: m.role,
          name: `${m.publicUserData?.firstName} ${m.publicUserData?.lastName}`,
          email: m.publicUserData?.identifier,
        })),
      },
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        responseTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Failed to get organization members',
      },
      500
    )
  }
})
