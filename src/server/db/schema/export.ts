import { pgTable, uuid, varchar, timestamp, text, integer, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Enums
export const exportStatusEnum = pgEnum('export_status', ['pending', 'processing', 'completed', 'failed'])
export const exportTypeEnum = pgEnum('export_type', ['clients', 'client_status', 'fcash_summary', 'pcni_summary', 'branch_performance', 'user_activity'])
export const exportFormatEnum = pgEnum('export_format', ['csv', 'xlsx'])

// Export Jobs Table
export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: exportTypeEnum('type').notNull(),
  format: exportFormatEnum('format').notNull(),
  status: exportStatusEnum('status').notNull().default('pending'),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  parameters: jsonb('parameters'), // filters, columns, options
  filePath: varchar('file_path', { length: 500 }),
  fileName: varchar('file_name', { length: 200 }),
  fileSize: integer('file_size'),
  rowCount: integer('row_count'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  error: text('error'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Export Templates Table (optional)
export const exportTemplates = pgTable('export_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  type: exportTypeEnum('type').notNull(),
  format: exportFormatEnum('format').notNull(),
  parameters: jsonb('parameters').notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  companyId: varchar('company_id', { length: 20 }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Relations
export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [exportJobs.createdBy],
    references: [users.id],
  }),
}))

export const exportTemplatesRelations = relations(exportTemplates, ({ one }) => ({
  createdByUser: one(users, {
    fields: [exportTemplates.createdBy],
    references: [users.id],
  }),
}))

// Type exports
export type ExportJob = typeof exportJobs.$inferSelect
export type NewExportJob = typeof exportJobs.$inferInsert
export type ExportTemplate = typeof exportTemplates.$inferSelect
export type NewExportTemplate = typeof exportTemplates.$inferInsert
