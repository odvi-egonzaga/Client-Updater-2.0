import { db } from "@/server/db";
import { syncJobs, exportJobs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  SEED_CONFIG,
  getRandomInt,
  getRandomItem,
  getRecentDate,
  getPastDate,
} from "./helpers";

export async function seedJobs(usersData: any[]) {
  console.log("Seeding jobs...");

  // Seed sync jobs
  const syncJobsToCreate = createSyncJobs(usersData);
  const insertedSyncJobs = await db.insert(syncJobs).values(syncJobsToCreate).onConflictDoNothing().returning();
  console.log(`  - ${insertedSyncJobs.length} sync jobs seeded`);

  // Seed export jobs
  const exportJobsToCreate = createExportJobs(usersData);
  const insertedExportJobs = await db.insert(exportJobs).values(exportJobsToCreate).onConflictDoNothing().returning();
  console.log(`  - ${insertedExportJobs.length} export jobs seeded`);

  console.log("Jobs seeded successfully!");

  return { syncJobs: insertedSyncJobs, exportJobs: insertedExportJobs };
}

function createSyncJobs(usersData: any[]): typeof syncJobs.$inferInsert[] {
  const jobs: typeof syncJobs.$inferInsert[] = [];

  // Create completed jobs
  const completedJobsCount = Math.floor(SEED_CONFIG.syncJobs * 0.6);
  for (let i = 0; i < completedJobsCount; i++) {
    const type = getRandomItem(["snowflake", "nextbank"] as const);
    const job = createSyncJob(type, "completed", usersData);
    jobs.push(job);
  }

  // Create processing jobs
  const processingJobsCount = Math.floor(SEED_CONFIG.syncJobs * 0.2);
  for (let i = 0; i < processingJobsCount; i++) {
    const type = getRandomItem(["snowflake", "nextbank"] as const);
    const job = createSyncJob(type, "processing", usersData);
    jobs.push(job);
  }

  // Create pending jobs
  const pendingJobsCount = SEED_CONFIG.syncJobs - completedJobsCount - processingJobsCount;
  for (let i = 0; i < pendingJobsCount; i++) {
    const type = getRandomItem(["snowflake", "nextbank"] as const);
    const job = createSyncJob(type, "pending", usersData);
    jobs.push(job);
  }

  return jobs;
}

function createSyncJob(
  type: "snowflake" | "nextbank",
  status: "pending" | "processing" | "completed" | "failed" | "dead",
  usersData: any[]
): typeof syncJobs.$inferInsert {
  const createdBy = getRandomItem(usersData);
  const recordsProcessed = getRandomInt(50, 500);
  const recordsCreated = Math.floor(recordsProcessed * 0.3);
  const recordsUpdated = Math.floor(recordsProcessed * 0.6);

  const job: any = {
    type,
    status,
    parameters: {
      source: type,
      fullSync: getRandomItem([true, false]),
      dryRun: false,
    },
    recordsProcessed,
    recordsCreated,
    recordsUpdated,
    createdBy: createdBy?.id,
  };

  // Add timestamps based on status
  if (status === "completed") {
    job.startedAt = getPastDate(7);
    job.completedAt = getRecentDate(1);
  } else if (status === "processing") {
    job.startedAt = getRecentDate(1);
  }

  // Add error for failed jobs
  if (status === "failed") {
    job.error = getRandomItem([
      "Connection timeout",
      "Invalid credentials",
      "Data validation failed",
      "Rate limit exceeded",
    ]);
    job.startedAt = getPastDate(1);
    job.completedAt = getRecentDate(1);
  }

  return job;
}

function createExportJobs(usersData: any[]): typeof exportJobs.$inferInsert[] {
  const jobs: typeof exportJobs.$inferInsert[] = [];

  // Create completed jobs
  const completedJobsCount = Math.floor(SEED_CONFIG.exportJobs * 0.6);
  for (let i = 0; i < completedJobsCount; i++) {
    const job = createExportJob("completed", usersData);
    jobs.push(job);
  }

  // Create processing jobs
  const processingJobsCount = Math.floor(SEED_CONFIG.exportJobs * 0.2);
  for (let i = 0; i < processingJobsCount; i++) {
    const job = createExportJob("processing", usersData);
    jobs.push(job);
  }

  // Create pending jobs
  const pendingJobsCount = SEED_CONFIG.exportJobs - completedJobsCount - processingJobsCount;
  for (let i = 0; i < pendingJobsCount; i++) {
    const job = createExportJob("pending", usersData);
    jobs.push(job);
  }

  return jobs;
}

function createExportJob(
  status: "pending" | "processing" | "completed" | "failed" | "dead",
  usersData: any[]
): typeof exportJobs.$inferInsert {
  const createdBy = getRandomItem(usersData);
  const type = getRandomItem(["clients", "status", "report"]);
  const format = getRandomItem(["csv", "xlsx"] as const);

  const job: any = {
    type,
    format,
    status,
    parameters: {
      filters: {
        status: getRandomItem(["all", "pending", "done"]),
        dateRange: "last_30_days",
      },
      columns: ["clientCode", "fullName", "status", "branch"],
    },
    filePath: `/exports/${type}_${Date.now()}.${format}`,
    fileSize: getRandomInt(1024, 10240), // 1KB to 10KB
    createdBy: createdBy?.id,
  };

  // Add timestamps based on status
  if (status === "completed") {
    job.startedAt = getPastDate(3);
    job.completedAt = getRecentDate(1);
    job.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  } else if (status === "processing") {
    job.startedAt = getRecentDate(1);
  }

  // Add error for failed jobs
  if (status === "failed") {
    job.error = getRandomItem([
      "Export failed: Memory limit exceeded",
      "Export failed: Invalid filter parameters",
      "Export failed: File system error",
    ]);
    job.startedAt = getPastDate(1);
    job.completedAt = getRecentDate(1);
  }

  return job;
}
