import { pgTable, uuid, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { companies } from './lookups'

// Areas
export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  companyId: varchar('company_id', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Branches
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  location: varchar('location', { length: 200 }),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Area-Branch junction table
export const areaBranches = pgTable('area_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  areaId: uuid('area_id').notNull().references(() => areas.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
})

// Branch contacts
export const branchContacts = pgTable('branch_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // phone, email, mobile, fax
  label: varchar('label', { length: 50 }), // Office, Mobile, etc.
  value: varchar('value', { length: 200 }).notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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






