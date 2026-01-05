import { pgTable, uuid, varchar, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'

// Areas
export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Branches
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  location: varchar('location', { length: 500 }),
  category: varchar('category', { length: 100 }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Area-Branch junction table
export const areaBranches = pgTable('area_branches', {
  areaId: uuid('area_id').notNull().references(() => areas.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  isPrimary: boolean('is_primary').default(false).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.areaId, table.branchId] }),
}))

// Branch contacts
export const branchContacts = pgTable('branch_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  type: varchar('type', { length: 50 }).notNull(), // phone, email, etc.
  value: varchar('value', { length: 255 }).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const areasRelations = relations(areas, ({ one, many }) => ({
  company: one(companies, {
    fields: [areas.companyId],
    references: [companies.id],
  }),
  areaBranches: many(areaBranches),
}))

export const branchesRelations = relations(branches, ({ many }) => ({
  areaBranches: many(areaBranches),
  contacts: many(branchContacts),
}))

export const areaBranchesRelations = relations(areaBranches, ({ one }) => ({
  area: one(areas, {
    fields: [areaBranches.areaId],
    references: [areas.id],
  }),
  branch: one(branches, {
    fields: [areaBranches.branchId],
    references: [branches.id],
  }),
}))

export const branchContactsRelations = relations(branchContacts, ({ one }) => ({
  branch: one(branches, {
    fields: [branchContacts.branchId],
    references: [branches.id],
  }),
}))

// Type exports
export type Area = typeof areas.$inferSelect
export type NewArea = typeof areas.$inferInsert
export type Branch = typeof branches.$inferSelect
export type NewBranch = typeof branches.$inferInsert
export type AreaBranch = typeof areaBranches.$inferSelect
export type BranchContact = typeof branchContacts.$inferSelect



