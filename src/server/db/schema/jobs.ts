import { pgTable, uuid, varchar, timestamp, text, integer, jsonb, pgEnum, bigserial, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Enums
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed', 'dead'])
export const syncJobTypeEnum = pgEnum('sync_job_type', ['snowflake', 'nextbank'])

// Sync jobs
export const syncJobs = pgTable('sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: syncJobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  parameters: jsonb('parameters'),
  recordsProcessed: integer('records_processed').default(0),
  recordsCreated: integer('records_created').default(0),
  recordsUpdated: integer('records_updated').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Generic job queue for background processing
export const jobQueue = pgTable('job_queue', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  queueName: varchar('queue_name', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  priority: integer('priority').default(0).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Scheduled jobs config (for pg_cron)
export const scheduledJobs = pgTable('scheduled_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  cronExpression: varchar('cron_expression', { length: 50 }).notNull(),
  functionName: varchar('function_name', { length: 100 }).notNull(),
  payload: jsonb('payload'),
  isActive: boolean('is_active').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const syncJobsRelations = relations(syncJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [syncJobs.createdBy],
    references: [users.id],
  }),
}))

// Type exports
export type SyncJob = typeof syncJobs.$inferSelect
export type NewSyncJob = typeof syncJobs.$inferInsert
export type JobQueueItem = typeof jobQueue.$inferSelect
export type NewJobQueueItem = typeof jobQueue.$inferInsert
export type ScheduledJob = typeof scheduledJobs.$inferSelect







