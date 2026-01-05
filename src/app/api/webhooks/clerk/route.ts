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

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
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
      console.error('Error verifying webhook:', err)
      return new Response('Error: Invalid signature', { status: 400 })
    }

    // Handle the event
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

    if (eventType === 'organizationMembership.created' || eventType === 'organizationMembership.updated') {
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
