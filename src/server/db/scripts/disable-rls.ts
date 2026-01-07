import { db } from "@/server/db";
import { sql } from "drizzle-orm";

/**
 * Disable Row Level Security (RLS) on all tables
 * Run this script once to disable RLS for security compliance
 */
async function disableRLS() {
  console.log("Disabling Row Level Security (RLS) on all tables...\n");

  const tables = [
    // Lookup tables
    "companies",
    "pension_types",
    "pensioner_types",
    "products",
    "account_types",
    "par_statuses",
    "status_types",
    "status_reasons",

    // Organization tables
    "areas",
    "branches",
    "area_branches",
    "branch_contacts",

    // User tables
    "users",
    "permissions",
    "user_permissions",
    "user_branches",
    "user_areas",
    "user_sessions",

    // Client tables
    "clients",
    "client_period_status",
    "status_events",
    "client_sync_history",

    // Job tables
    "sync_jobs",
    "export_jobs",
    "job_queue",
    "scheduled_jobs",

    // Config tables
    "config_categories",
    "config_options",
    "config_settings",
    "config_audit_log",
    "activity_logs",

    // Health check tables
    "health_checks",
  ];

  let disabled = 0;
  let skipped = 0;
  let errors = 0;

  for (const table of tables) {
    try {
      await db.execute(
        sql.raw(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`),
      );
      console.log(`  ✓ Disabled RLS on: ${table}`);
      disabled++;
    } catch (error: unknown) {
      const err = error as Error;
      // If table doesn't exist or RLS already disabled, skip
      if (
        err.message.includes("does not exist") ||
        err.message.includes("already disabled")
      ) {
        console.log(
          `  ⊘ Skipped: ${table} (${err.message.includes("does not exist") ? "table does not exist" : "RLS already disabled"})`,
        );
        skipped++;
      } else {
        console.error(`  ✗ Error on ${table}:`, err.message);
        errors++;
      }
    }
  }

  console.log(`\n✅ RLS Disable Complete:`);
  console.log(`   Disabled: ${disabled}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);

  process.exit(errors > 0 ? 1 : 0);
}

disableRLS();
