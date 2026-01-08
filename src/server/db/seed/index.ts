import { seedLookups } from "./lookups";
import { seedPermissions } from "./permissions";
import { seedOrganization } from "./organization";
import { seedUsers } from "./users";
import { seedClients } from "./clients";
import { seedClientStatus } from "./client-status";
import { seedStatusEvents } from "./status-events";
import { seedJobs } from "./jobs";
import { seedActivityLogs } from "./activity-logs";
import { seedConfig } from "./config";
import { SEED_CONFIG } from "./helpers";

async function main() {
  console.log("Starting database seed...\n");

  try {
    // Step 1: Seed lookups (reference data)
    await seedLookups();

    // Step 2: Seed permissions
    await seedPermissions();
    console.log("");

    // Step 3: Seed organization (areas and branches)
    const organizationData = await seedOrganization();
    console.log("");

    // Step 4: Seed users with permissions and assignments
    const usersData = await seedUsers(organizationData);
    console.log("");

    // Step 5: Seed clients
    const clientsData = await seedClients(organizationData);
    console.log("");

    // Step 6: Seed client period status
    const clientStatusesData = await seedClientStatus(clientsData, usersData);
    console.log("");

    // Step 7: Seed status events
    await seedStatusEvents(clientStatusesData, usersData);
    console.log("");

    // Step 8: Seed jobs (sync and export)
    await seedJobs(usersData);
    console.log("");

    // Step 9: Seed activity logs
    await seedActivityLogs(usersData, clientsData);
    console.log("");

    // Step 10: Seed config settings
    await seedConfig(usersData);

    console.log("\n✅ Database seeded successfully!");
    console.log("\nSummary:");
    console.log(`  - Areas: ${organizationData.areas.length}`);
    console.log(`  - Branches: ${organizationData.branches.length}`);
    console.log(`  - Users: ${usersData.length}`);
    console.log(`  - Clients: ${clientsData.length}`);
    console.log(`  - Client Statuses: ${clientStatusesData.length}`);
    console.log(`  - Activity Logs: ${SEED_CONFIG.activityLogs}`);
    console.log(`  - Config Settings: ${SEED_CONFIG.configSettings}`);
    console.log(`  - Sync Jobs: ${SEED_CONFIG.syncJobs}`);
    console.log(`  - Export Jobs: ${SEED_CONFIG.exportJobs}`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
