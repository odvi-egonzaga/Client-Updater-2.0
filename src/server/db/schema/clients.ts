import { pgTable, uuid, varchar, boolean, timestamp, text, decimal, integer, date, pgEnum, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { pensionTypes, pensionerTypes, products, accountTypes, parStatuses, statusTypes, statusReasons } from './lookups'
import { branches } from './organization'
import { users } from './users'

// Enums
export const syncSourceEnum = pgEnum('sync_source', ['snowflake', 'nextbank'])
export const periodTypeEnum = pgEnum('period_type', ['monthly', 'quarterly'])

// Main clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientCode: varchar('client_code', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  pensionNumber: varchar('pension_number', { length: 100 }),
  birthDate: date('birth_date'),
  contactNumber: varchar('contact_number', { length: 50 }),
  contactNumberAlt: varchar('contact_number_alt', { length: 50 }),

  // Foreign keys
  pensionTypeId: uuid('pension_type_id').references(() => pensionTypes.id),
  pensionerTypeId: uuid('pensioner_type_id').references(() => pensionerTypes.id),
  productId: uuid('product_id').references(() => products.id),
  branchId: uuid('branch_id').references(() => branches.id),
  parStatusId: uuid('par_status_id').references(() => parStatuses.id),
  accountTypeId: uuid('account_type_id').references(() => accountTypes.id),

  // Financial
  pastDueAmount: decimal('past_due_amount', { precision: 15, scale: 2 }),
  loanStatus: varchar('loan_status', { length: 50 }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Sync tracking
  lastSyncedAt: timestamp('last_synced_at'),
  syncSource: syncSourceEnum('sync_source'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
})

// Client period status (current snapshot)
export const clientPeriodStatus = pgTable('client_period_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),

  // Period
  periodType: periodTypeEnum('period_type').notNull(),
  periodMonth: integer('period_month'), // 1-12 for monthly
  periodQuarter: integer('period_quarter'), // 1-4 for quarterly
  periodYear: integer('period_year').notNull(),

  // Status
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  reasonId: uuid('reason_id').references(() => statusReasons.id),
  remarks: text('remarks'),
  hasPayment: boolean('has_payment').default(false).notNull(),
  updateCount: integer('update_count').default(0).notNull(),
  isTerminal: boolean('is_terminal').default(false).notNull(),

  // Tracking
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniquePeriod: unique('client_period_status_period_unique').on(table.clientId, table.periodType, table.periodMonth, table.periodQuarter, table.periodYear),
}))

// Status events (audit trail)
export const statusEvents = pgTable('status_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientPeriodStatusId: uuid('client_period_status_id').notNull().references(() => clientPeriodStatus.id, { onDelete: 'cascade' }),

  // Status at time of event
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  reasonId: uuid('reason_id').references(() => statusReasons.id),
  remarks: text('remarks'),
  hasPayment: boolean('has_payment').default(false).notNull(),

  // Event tracking
  eventSequence: integer('event_sequence').notNull(),

  // Audit
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Client sync history
export const clientSyncHistory = pgTable('client_sync_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  fieldChanged: varchar('field_changed', { length: 100 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  syncJobId: uuid('sync_job_id'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
})

// Relations
export const clientsRelations = relations(clients, ({ one, many }) => ({
  pensionType: one(pensionTypes, {
    fields: [clients.pensionTypeId],
    references: [pensionTypes.id],
  }),
  pensionerType: one(pensionerTypes, {
    fields: [clients.pensionerTypeId],
    references: [pensionerTypes.id],
  }),
  product: one(products, {
    fields: [clients.productId],
    references: [products.id],
  }),
  branch: one(branches, {
    fields: [clients.branchId],
    references: [branches.id],
  }),
  parStatus: one(parStatuses, {
    fields: [clients.parStatusId],
    references: [parStatuses.id],
  }),
  accountType: one(accountTypes, {
    fields: [clients.accountTypeId],
    references: [accountTypes.id],
  }),
  periodStatuses: many(clientPeriodStatus),
  syncHistory: many(clientSyncHistory),
}))

export const clientPeriodStatusRelations = relations(clientPeriodStatus, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientPeriodStatus.clientId],
    references: [clients.id],
  }),
  statusType: one(statusTypes, {
    fields: [clientPeriodStatus.statusTypeId],
    references: [statusTypes.id],
  }),
  reason: one(statusReasons, {
    fields: [clientPeriodStatus.reasonId],
    references: [statusReasons.id],
  }),
  updatedByUser: one(users, {
    fields: [clientPeriodStatus.updatedBy],
    references: [users.id],
  }),
  events: many(statusEvents),
}))

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  periodStatus: one(clientPeriodStatus, {
    fields: [statusEvents.clientPeriodStatusId],
    references: [clientPeriodStatus.id],
  }),
  statusType: one(statusTypes, {
    fields: [statusEvents.statusTypeId],
    references: [statusTypes.id],
  }),
  reason: one(statusReasons, {
    fields: [statusEvents.reasonId],
    references: [statusReasons.id],
  }),
  createdByUser: one(users, {
    fields: [statusEvents.createdBy],
    references: [users.id],
  }),
}))

// Type exports
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type ClientPeriodStatus = typeof clientPeriodStatus.$inferSelect
export type NewClientPeriodStatus = typeof clientPeriodStatus.$inferInsert
export type StatusEvent = typeof statusEvents.$inferSelect
export type NewStatusEvent = typeof statusEvents.$inferInsert
export type ClientSyncHistory = typeof clientSyncHistory.$inferSelect






