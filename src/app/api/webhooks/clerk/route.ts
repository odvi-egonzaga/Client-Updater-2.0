import type { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { env } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema/users'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { createUser, updateUser, deactivateUser, getUserByClerkId, recordUserLogin } from '@/server/db/queries/users'

export async function POST(req: Request) {
  try {
    // Get headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      logger.error('Missing Svix headers', new Error('Missing Svix headers'), {
        action: 'webhook_verification',
      })
      return new Response('Error: Missing Svix headers', { status: 400 })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your secret
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET ?? '')

    let event: WebhookEvent

    // Verify the payload with the headers
    try {
      event = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      logger.error('Error verifying webhook', err as Error, {
        action: 'webhook_verification',
      })
      return new Response('Error: Invalid signature', { status: 400 })
    }

    // Handle the event
    const eventType = event.type

    logger.info('Webhook event received', {
      action: 'webhook_received',
      eventType,
      eventId: event.data.id,
    })

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      // Generate internal UUID
      const internalId = crypto.randomUUID()
      const email = email_addresses[0]?.email_address ?? ''

      try {
        await createUser(db, {
          id: internalId,
          clerkId: id,
          email,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          imageUrl: image_url ?? null,
        })

        logger.info('User created via webhook', {
          action: 'user_created',
          internalId,
          clerkId: id,
          email,
        })
      } catch (error) {
        logger.error('Failed to create user via webhook', error as Error, {
          action: 'user_created',
          clerkId: id,
          email,
        })
        return new Response('Error: Failed to create user', { status: 500 })
      }
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      try {
        // Find user by clerkId
        const existingUser = await getUserByClerkId(id)

        if (!existingUser) {
          logger.warn('User not found for update', {
            action: 'user_updated',
            clerkId: id,
          })
          return new Response('Error: User not found', { status: 404 })
        }

        await updateUser(db, existingUser.id, {
          email: email_addresses?.[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        })

        logger.info('User updated via webhook', {
          action: 'user_updated',
          internalId: existingUser.id,
          clerkId: id,
        })
      } catch (error) {
        logger.error('Failed to update user via webhook', error as Error, {
          action: 'user_updated',
          clerkId: id,
        })
        return new Response('Error: Failed to update user', { status: 500 })
      }
    }

    if (eventType === 'user.deleted') {
      const { id } = event.data

      try {
        // Find user by clerkId
        const existingUser = await getUserByClerkId(id)

        if (!existingUser) {
          logger.warn('User not found for deletion', {
            action: 'user_deleted',
            clerkId: id,
          })
          return new Response('Error: User not found', { status: 404 })
        }

        // Soft delete user
        await deactivateUser(db, existingUser.id)

        logger.info('User soft deleted via webhook', {
          action: 'user_deleted',
          internalId: existingUser.id,
          clerkId: id,
        })
      } catch (error) {
        logger.error('Failed to delete user via webhook', error as Error, {
          action: 'user_deleted',
          clerkId: id,
        })
        return new Response('Error: Failed to delete user', { status: 500 })
      }
    }

    if (eventType === 'session.created') {
      const data = event.data as any
      const userId = data.user_id
      const ipAddress = data.ip_address ?? 'unknown'
      const userAgent = data.user_agent ?? 'unknown'

      try {
        // Find user by clerkId
        const existingUser = await getUserByClerkId(userId)

        if (!existingUser) {
          logger.warn('User not found for session creation', {
            action: 'session_created',
            clerkId: userId,
          })
          return new Response('Error: User not found', { status: 404 })
        }

        // Record login
        await recordUserLogin(db, existingUser.id, ipAddress, userAgent)

        logger.info('Session created via webhook', {
          action: 'session_created',
          internalId: existingUser.id,
          clerkId: userId,
          ipAddress,
        })
      } catch (error) {
        logger.error('Failed to record session via webhook', error as Error, {
          action: 'session_created',
          clerkId: userId,
        })
        return new Response('Error: Failed to record session', { status: 500 })
      }
    }

    if (eventType === 'session.ended') {
      const data = event.data as any
      const userId = data.user_id

      try {
        // Find user by clerkId
        const existingUser = await getUserByClerkId(userId)

        if (!existingUser) {
          logger.warn('User not found for session end', {
            action: 'session_ended',
            clerkId: userId,
          })
          return new Response('Error: User not found', { status: 404 })
        }

        logger.info('Session ended via webhook', {
          action: 'session_ended',
          internalId: existingUser.id,
          clerkId: userId,
        })
      } catch (error) {
        logger.error('Failed to process session end via webhook', error as Error, {
          action: 'session_ended',
          clerkId: userId,
        })
        return new Response('Error: Failed to process session end', { status: 500 })
      }
    }

    if (eventType === 'organizationMembership.created') {
      const data = event.data as any
      const userId = data.public_user_data.user_id
      const orgId = data.organization.id

      try {
        // Find user by clerkId
        const existingUser = await getUserByClerkId(userId)

        if (!existingUser) {
          logger.warn('User not found for organization membership creation', {
            action: 'organization_membership_created',
            clerkId: userId,
          })
          return new Response('Error: User not found', { status: 404 })
        }

        await updateUser(db, existingUser.id, {
          clerkOrgId: orgId,
        })

        logger.info('Organization membership created via webhook', {
          action: 'organization_membership_created',
          internalId: existingUser.id,
          clerkId: userId,
          clerkOrgId: orgId,
        })
      } catch (error) {
        logger.error('Failed to create organization membership via webhook', error as Error, {
          action: 'organization_membership_created',
          clerkId: userId,
        })
        return new Response('Error: Failed to create organization membership', { status: 500 })
      }
    }

    if (eventType === 'organizationMembership.updated') {
      const data = event.data as any
      const userId = data.public_user_data.user_id
      const orgId = data.organization.id

      try {
        // Find user by clerkId
        const existingUser = await getUserByClerkId(userId)

        if (!existingUser) {
          logger.warn('User not found for organization membership update', {
            action: 'organization_membership_updated',
            clerkId: userId,
          })
          return new Response('Error: User not found', { status: 404 })
        }

        await updateUser(db, existingUser.id, {
          clerkOrgId: orgId,
        })

        logger.info('Organization membership updated via webhook', {
          action: 'organization_membership_updated',
          internalId: existingUser.id,
          clerkId: userId,
          clerkOrgId: orgId,
        })
      } catch (error) {
        logger.error('Failed to update organization membership via webhook', error as Error, {
          action: 'organization_membership_updated',
          clerkId: userId,
        })
        return new Response('Error: Failed to update organization membership', { status: 500 })
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    logger.error('Error processing webhook', error as Error, {
      action: 'webhook_processing',
    })
    return new Response('Error: Webhook processing failed', { status: 500 })
  }
}
