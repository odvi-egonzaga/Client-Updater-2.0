// Webhook events schema for idempotency tracking
import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

// Webhook events table for idempotency tracking
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  payload: jsonb("payload").notNull(),
});

// Type exports
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
