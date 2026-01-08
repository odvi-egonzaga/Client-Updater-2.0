// Health checks table schema placeholder
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const healthCheckTests = pgTable("health_check_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  testKey: text("test_key").notNull(),
  testValue: text("test_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HealthCheckTest = typeof healthCheckTests.$inferSelect;
