import { db } from "@/server/db";
import { activityLogs } from "@/server/db/schema";
import { faker } from "@faker-js/faker";
import { SEED_CONFIG, getRandomInt, getRandomItem } from "./helpers";

export async function seedActivityLogs(usersData: any[], clientsData: any[]) {
  console.log("Seeding activity logs...");

  const activityLogsToCreate: typeof activityLogs.$inferInsert[] = [];

  // Define different types of user actions
  const actionTypes = [
    "login",
    "logout",
    "view_client",
    "update_status",
    "export_report",
    "view_dashboard",
    "search_client",
    "view_reports",
    "create_sync_job",
    "view_user_profile",
  ];

  // Create activity logs for each user
  usersData.forEach((user) => {
    const numLogs = Math.floor(SEED_CONFIG.activityLogs / usersData.length);

    for (let i = 0; i < numLogs; i++) {
      const action = getRandomItem(actionTypes);
      const activityLog = createActivityLog(user, clientsData, action);
      activityLogsToCreate.push(activityLog);
    }
  });

  // Sort by createdAt
  activityLogsToCreate.sort((a, b) =>
    a.createdAt!.getTime() - b.createdAt!.getTime()
  );

  // Limit to configured number
  const limitedLogs = activityLogsToCreate.slice(0, SEED_CONFIG.activityLogs);

  if (limitedLogs.length > 0) {
    await db.insert(activityLogs).values(limitedLogs).onConflictDoNothing();
    console.log(`  - ${limitedLogs.length} activity logs seeded`);
  } else {
    console.log(`  - No activity logs to seed`);
  }

  console.log("Activity logs seeded successfully!");

  return limitedLogs;
}

function createActivityLog(
  user: any,
  clientsData: any[],
  action: string
): typeof activityLogs.$inferInsert {
  const createdAt = faker.date.recent({ days: 30 });
  const ipAddress = faker.internet.ip();
  const userAgent = faker.internet.userAgent();

  const log: any = {
    userId: user.id,
    action,
    createdAt,
    ipAddress,
    userAgent,
  };

  // Add resource and resourceId based on action
  switch (action) {
    case "view_client":
    case "update_status":
      const client = getRandomItem(clientsData);
      log.resource = "client";
      log.resourceId = client?.id;
      log.details = {
        clientCode: client?.clientCode,
        fullName: client?.fullName,
      };
      log.durationMs = getRandomInt(100, 5000);
      break;

    case "export_report":
      log.resource = "report";
      log.resourceId = null;
      log.details = {
        reportType: getRandomItem(["clients", "status", "summary"]),
        format: getRandomItem(["csv", "xlsx"]),
      };
      log.durationMs = getRandomInt(1000, 10000);
      break;

    case "create_sync_job":
      log.resource = "sync_job";
      log.resourceId = null;
      log.details = {
        syncType: getRandomItem(["snowflake", "nextbank"]),
      };
      log.durationMs = getRandomInt(500, 3000);
      break;

    case "login":
    case "logout":
      log.resource = "session";
      log.resourceId = null;
      log.details = null;
      log.durationMs = null;
      break;

    case "view_dashboard":
    case "view_reports":
    case "view_user_profile":
    case "search_client":
      log.resource = null;
      log.resourceId = null;
      log.details = null;
      log.durationMs = getRandomInt(100, 2000);
      break;

    default:
      log.resource = null;
      log.resourceId = null;
      log.details = null;
      log.durationMs = null;
  }

  return log;
}
