import { pgTable, uuid, varchar, boolean, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Common columns for lookup tables
const lookupColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}

// Enums
export const trackingCycleEnum = pgEnum('tracking_cycle', ['monthly', 'quarterly'])

// Companies (FCASH, PCNI)
export const companies = pgTable('companies', {
  ...lookupColumns,
  code: varchar('code', { length: 50 }).notNull(), // Override to remove unique constraint
})

// Pension Types (SSS, GSIS, PVAO, etc.)
export const pensionTypes = pgTable('pension_types', {
  ...lookupColumns,
  code: varchar('code', { length: 50 }).notNull(), // Override to remove unique constraint
  companyId: uuid('company_id').references(() => companies.id),
})

// Pensioner Types (DEPENDENT, DISABILITY, RETIREE, ITF)
export const pensionerTypes = pgTable('pensioner_types', {
  ...lookupColumns,
  pensionTypeId: uuid('pension_type_id').references(() => pensionTypes.id),
})

// Products
export const products = pgTable('products', {
  ...lookupColumns,
  companyId: uuid('company_id').references(() => companies.id),
  trackingCycle: trackingCycleEnum('tracking_cycle').default('monthly').notNull(),
})

// Account Types (PASSBOOK, ATM, BOTH, NONE)
export const accountTypes = pgTable('account_types', {
  ...lookupColumns,
})

// PAR Statuses (current, 30+, 60+)
export const parStatuses = pgTable('par_statuses', {
  ...lookupColumns,
  isTrackable: boolean('is_trackable').default(true).notNull(),
})

// Status Types (PENDING, TO_FOLLOW, CALLED, VISITED, UPDATED, DONE)
export const statusTypes = pgTable('status_types', {
  ...lookupColumns,
  sequence: integer('sequence').default(0).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
})

// Status Reasons
export const statusReasons = pgTable('status_reasons', {
  ...lookupColumns,
  statusTypeId: uuid('status_type_id').references(() => statusTypes.id),
  isTerminal: boolean('is_terminal').default(false).notNull(),
  requiresRemarks: boolean('requires_remarks').default(false).notNull(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  pensionTypes: many(pensionTypes),
  products: many(products),
  statusTypes: many(statusTypes),
}))

export const pensionTypesRelations = relations(pensionTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [pensionTypes.companyId],
    references: [companies.id],
  }),
  pensionerTypes: many(pensionerTypes),
}))

export const pensionerTypesRelations = relations(pensionerTypes, ({ one }) => ({
  pensionType: one(pensionTypes, {
    fields: [pensionerTypes.pensionTypeId],
    references: [pensionTypes.id],
  }),
}))

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
}))

export const statusTypesRelations = relations(statusTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [statusTypes.companyId],
    references: [companies.id],
  }),
  reasons: many(statusReasons),
}))

export const statusReasonsRelations = relations(statusReasons, ({ one }) => ({
  statusType: one(statusTypes, {
    fields: [statusReasons.statusTypeId],
    references: [statusTypes.id],
  }),
}))

// Type exports
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
export type PensionType = typeof pensionTypes.$inferSelect
export type NewPensionType = typeof pensionTypes.$inferInsert
export type PensionerType = typeof pensionerTypes.$inferSelect
export type StatusType = typeof statusTypes.$inferSelect
export type StatusReason = typeof statusReasons.$inferSelect
export type Product = typeof products.$inferSelect
export type AccountType = typeof accountTypes.$inferSelect
export type ParStatus = typeof parStatuses.$inferSelect



