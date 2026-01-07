import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { companies } from "./lookups";
import { users } from "./users";

// Enums
export const valueTypeEnum = pgEnum("value_type", [
  "string",
  "number",
  "boolean",
  "json",
]);

// Config categories
export const configCategories = pgTable("config_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Config options (dropdown options, etc.)
export const configOptions = pgTable("config_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => configCategories.id),
  code: varchar("code", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  value: text("value"),
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  parentOptionId: uuid("parent_option_id"),
  companyId: uuid("company_id").references(() => companies.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Config settings (key-value system settings)
export const configSettings = pgTable("config_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  valueType: valueTypeEnum("value_type").default("string").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Config audit log
export const configAuditLog = pgTable("config_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: uuid("record_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(), // create, update, delete
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changedBy: uuid("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }),
  resourceId: uuid("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const configCategoriesRelations = relations(
  configCategories,
  ({ many }) => ({
    options: many(configOptions),
  }),
);

export const configOptionsRelations = relations(
  configOptions,
  ({ one, many }) => ({
    category: one(configCategories, {
      fields: [configOptions.categoryId],
      references: [configCategories.id],
    }),
    parent: one(configOptions, {
      fields: [configOptions.parentOptionId],
      references: [configOptions.id],
      relationName: "parent_child",
    }),
    children: many(configOptions, {
      relationName: "parent_child",
    }),
    company: one(companies, {
      fields: [configOptions.companyId],
      references: [companies.id],
    }),
    createdByUser: one(users, {
      fields: [configOptions.createdBy],
      references: [users.id],
    }),
  }),
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type ConfigCategory = typeof configCategories.$inferSelect;
export type NewConfigCategory = typeof configCategories.$inferInsert;
export type ConfigOption = typeof configOptions.$inferSelect;
export type NewConfigOption = typeof configOptions.$inferInsert;
export type ConfigSetting = typeof configSettings.$inferSelect;
export type NewConfigSetting = typeof configSettings.$inferInsert;
export type ConfigAuditLogEntry = typeof configAuditLog.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

