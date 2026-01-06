// Activity logs table schema
import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Activity logs table
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  resource: varchar('resource', { length: 50 }),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  durationMs: integer('duration_ms'),
  statusCode: integer('status_code'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Relations
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}))

// Type exports
export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert
