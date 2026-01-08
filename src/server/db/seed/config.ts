import { db } from "@/server/db";
import { configSettings } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { SEED_CONFIG } from "./helpers";

export async function seedConfig(usersData: any[]) {
  console.log("Seeding config settings...");

  const configSettingsToCreate: typeof configSettings.$inferInsert[] = [];

  // Create system-wide settings
  configSettingsToCreate.push(
    {
      key: "app.name",
      value: "Client Updater",
      valueType: "string",
      description: "Application name",
      isPublic: true,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "app.version",
      value: "2.0.0",
      valueType: "string",
      description: "Application version",
      isPublic: true,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "tracking.default_cycle",
      value: "monthly",
      valueType: "string",
      description: "Default tracking cycle for new clients",
      isPublic: false,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "notifications.enabled",
      value: "true",
      valueType: "boolean",
      description: "Enable system notifications",
      isPublic: false,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "notifications.email_enabled",
      value: "true",
      valueType: "boolean",
      description: "Enable email notifications",
      isPublic: false,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "sync.snowflake_interval_hours",
      value: "24",
      valueType: "number",
      description: "Snowflake sync interval in hours",
      isPublic: false,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "sync.nextbank_interval_hours",
      value: "24",
      valueType: "number",
      description: "NextBank sync interval in hours",
      isPublic: false,
      updatedBy: usersData[0]?.id,
    },
    {
      key: "export.default_format",
      value: "xlsx",
      valueType: "string",
      description: "Default export format",
      isPublic: false,
      updatedBy: usersData[0]?.id,
    }
  );

  const insertedConfigSettings = await db
    .insert(configSettings)
    .values(configSettingsToCreate)
    .returning();

  console.log(`  - ${insertedConfigSettings.length} config settings seeded`);

  console.log("Config settings seeded successfully!");

  return insertedConfigSettings;
}
