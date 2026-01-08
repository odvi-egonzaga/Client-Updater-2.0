# Webhook Improvements - Idempotency and organizationMembership.deleted Handler

## Overview
This document describes the implementation of idempotency checks and the missing `organizationMembership.deleted` event handler for the Clerk webhook system.

## Changes Made

### 1. Created webhookEvents Schema Table
**File:** [`src/server/db/schema/webhooks.ts`](src/server/db/schema/webhooks.ts)

Created a new schema table to track processed webhook events for idempotency:

```typescript
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  payload: jsonb("payload").notNull(),
});
```

**Features:**
- `id`: UUID primary key for internal tracking
- `eventId`: The Clerk webhook event ID (unique constraint for idempotency)
- `eventType`: Type of the webhook event (e.g., "user.created", "organizationMembership.deleted")
- `processedAt`: Timestamp when the event was processed
- `payload`: Full JSON payload of the event for audit purposes

### 2. Exported webhookEvents Schema
**File:** [`src/server/db/schema/index.ts`](src/server/db/schema/index.ts)

Added export for the new webhook schema:
```typescript
export * from "./webhooks";
```

### 3. Created Webhook Query Functions
**File:** [`src/server/db/queries/webhooks.ts`](src/server/db/queries/webhooks.ts)

Implemented two key functions for idempotency:

#### `isEventProcessed(eventId: string)`
Checks if a webhook event has already been processed by querying the webhook_events table.

#### `markEventProcessed(eventId: string, eventType: string, payload: unknown)`
Records a webhook event as processed by inserting a record into the webhook_events table.

### 4. Updated Webhook Handler
**File:** [`src/app/api/webhooks/clerk/route.ts`](src/app/api/webhooks/clerk/route.ts)

#### Added Idempotency Check
Before processing any webhook event, the handler now:
1. Extracts the `event_id` from the Clerk webhook payload
2. Checks if this event has already been processed using `isEventProcessed()`
3. If already processed, returns 200 OK with message "Event already processed"
4. If not processed, continues with normal event handling
5. After successful processing, marks the event as processed using `markEventProcessed()`

#### Added organizationMembership.deleted Event Handler
Implemented the missing event handler that:
1. Extracts the `user_id` from the event data
2. Looks up the user by `clerk_id`
3. Updates the user's `clerkOrgId` field to `null`
4. Logs the operation
5. Returns appropriate status codes (404 if user not found, 500 on error, 200 on success)

### 5. Created Test File
**File:** [`src/server/db/queries/__tests__/webhooks.test.ts`](src/server/db/queries/__tests__/webhooks.test.ts)

Created comprehensive tests for the idempotency functionality:
- Test that non-processed events return false
- Test that events can be marked as processed
- Test that event details are stored correctly
- Test that already processed events return true

## Database Migration

A migration file was generated at [`drizzle/0001_empty_dark_beast.sql`](drizzle/0001_empty_dark_beast.sql) to create the webhook_events table.

The table was created in the database using the following SQL:
```sql
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp DEFAULT now() NOT NULL,
  payload jsonb NOT NULL,
  CONSTRAINT webhook_events_event_id_unique UNIQUE(event_id)
);
```

## Benefits

### Idempotency
- Prevents duplicate webhook events from causing issues
- Ensures data consistency even if Clerk sends the same event multiple times
- Provides audit trail of all processed events
- Returns early for duplicate events, reducing unnecessary processing

### organizationMembership.deleted Handler
- Properly handles user removal from organizations
- Clears the `clerkOrgId` field when a user is removed from an organization
- Maintains data consistency between Clerk and Supabase
- Follows existing code patterns and error handling

## Error Handling

Both implementations follow the existing error handling patterns:
- Database errors are logged with context
- Appropriate HTTP status codes are returned
- All operations are logged for debugging and auditing
- Errors are propagated to the caller for handling

## Testing

The test file provides comprehensive coverage of the idempotency functionality. Tests can be run with:
```bash
pnpm test src/server/db/queries/__tests__/webhooks.test.ts
```

Note: Tests require a properly configured database connection in the environment.

## Future Considerations

1. **Cleanup Strategy**: Consider implementing a cleanup job to remove old webhook events (e.g., older than 30 days) to prevent the table from growing indefinitely.

2. **Monitoring**: Add metrics to track:
   - Number of duplicate events detected
   - Time spent on idempotency checks
   - Event processing success/failure rates

3. **Retry Logic**: Consider implementing exponential backoff for failed event processing.

4. **Event Replay**: The stored payload could be used for event replay functionality if needed.

## Conclusion

The implementation successfully adds idempotency checks and the missing `organizationMembership.deleted` event handler to the Clerk webhook system. These improvements enhance the reliability and consistency of the webhook processing system.
