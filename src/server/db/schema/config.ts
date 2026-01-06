import { pgTable, uuid, varchar, boolean, timestamp, text, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'
import { users } from './users'

// Config categories
export const configCategories = pgTable('config_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Config options (dropdown options, etc.)
export const configOptions = pgTable('config_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => configCategories.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  value: text('value'),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  isSystem: boolean('is_system').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  parentOptionId: uuid('parent_option_id'),
  companyId: varchar('company_id', { length: 20 }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Config settings (key-value system settings)
export const configSettings = pgTable('config_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  valueType: varchar('value_type', { length: 20 }).notNull().default('string'), // string, number, boolean, json
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  companyId: varchar('company_id', { length: 20 }),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Config audit log
export const configAuditLog = pgTable('config_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  recordId: uuid('record_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // create, update, delete
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Activity logs
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const configCategoriesRelations = relations(configCategories, ({ many }) => ({
  options: many(configOptions),
}))

export const configOptionsRelations = relations(configOptions, ({ one, many }) => ({
  category: one(configCategories, {
    fields: [configOptions.categoryId],
    references: [configCategories.id],
  }),
  parent: one(configOptions, {
    fields: [configOptions.parentOptionId],
    references: [configOptions.id],
    relationName: 'parent_child',
  }),
  children: many(configOptions, {
    relationName: 'parent_child',
  }),
  company: one(companies, {
    fields: [configOptions.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [configOptions.createdBy],
    references: [users.id],
  }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}))

// Type exports
export type ConfigCategory = typeof configCategories.$inferSelect
export type NewConfigCategory = typeof configCategories.$inferInsert
export type ConfigOption = typeof configOptions.$inferSelect
export type NewConfigOption = typeof configOptions.$inferInsert
export type ConfigSetting = typeof configSettings.$inferSelect
export type NewConfigSetting = typeof configSettings.$inferInsert
export type ConfigAuditLogEntry = typeof configAuditLog.$inferSelect
export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert







