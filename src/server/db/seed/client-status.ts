import { db } from "@/server/db";
import { clientPeriodStatus, statusTypes, statusReasons } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  SEED_CONFIG,
  getRandomInt,
  getRandomItem,
  getRandomBoolean,
} from "./helpers";

export async function seedClientStatus(clientsData: any[], usersData: any[]) {
  console.log("Seeding client period status...");

  // Get status types and reasons
  const statusTypesData = await db.select().from(statusTypes);
  const statusReasonsData = await db.select().from(statusReasons);

  const clientStatusesToCreate: typeof clientPeriodStatus.$inferInsert[] = [];

  // Create period status for each client
  clientsData.forEach((client) => {
    const statusType = selectStatusType(client, statusTypesData);
    const statusReason = selectStatusReason(statusType, statusReasonsData);
    const updatedBy = getRandomItem(usersData);

    const periodStatus = createClientPeriodStatus(
      client,
      statusType,
      statusReason,
      updatedBy
    );

    clientStatusesToCreate.push(periodStatus);
  });

  const insertedClientStatuses = await db
    .insert(clientPeriodStatus)
    .values(clientStatusesToCreate)
    .onConflictDoNothing()
    .returning();

  console.log(`  - ${insertedClientStatuses.length} client period statuses seeded`);

  console.log("Client period status seeded successfully!");

  return insertedClientStatuses;
}

function selectStatusType(client: any, statusTypesData: any[]): any {
  // Distribute status types based on client's PAR status
  if (client.loanStatus === "60+ Days") {
    // Clients with 60+ days are more likely to be DONE or UPDATED
    const doneStatus = statusTypesData.find((st) => st.code === "DONE");
    const updatedStatus = statusTypesData.find((st) => st.code === "UPDATED");
    return getRandomBoolean(0.7) ? doneStatus : updatedStatus;
  } else if (client.loanStatus === "30+ Days") {
    // Clients with 30+ days are more likely to be TO_FOLLOW, CALLED, or VISITED
    const possibleStatuses = statusTypesData.filter((st) =>
      ["TO_FOLLOW", "CALLED", "VISITED", "UPDATED"].includes(st.code)
    );
    return getRandomItem(possibleStatuses);
  } else {
    // Current clients are more likely to be PENDING or TO_FOLLOW
    const possibleStatuses = statusTypesData.filter((st) =>
      ["PENDING", "TO_FOLLOW", "CALLED"].includes(st.code)
    );
    return getRandomItem(possibleStatuses);
  }
}

function selectStatusReason(statusType: any, statusReasonsData: any[]): any | null {
  // Only DONE status has reasons
  if (statusType?.code !== "DONE") {
    return null;
  }

  // Get reasons for DONE status
  const doneReasons = statusReasonsData.filter((sr) => sr.statusTypeId === statusType.id);

  if (doneReasons.length === 0) {
    return null;
  }

  return getRandomItem(doneReasons);
}

function createClientPeriodStatus(
  client: any,
  statusType: any,
  statusReason: any,
  updatedBy: any
): typeof clientPeriodStatus.$inferInsert {
  const updateCount = getUpdateCount(statusType?.code);
  const hasPayment = getHasPayment(statusType?.code);

  return {
    clientId: client.id,
    periodType: "monthly",
    periodMonth: 1, // January
    periodQuarter: 1,
    periodYear: 2026,
    statusTypeId: statusType?.id,
    reasonId: statusReason?.id,
    remarks: generateRemarks(statusType?.code, statusReason?.code),
    hasPayment,
    updateCount,
    isTerminal: statusReason?.isTerminal || false,
    updatedBy: updatedBy?.id,
  };
}

function getUpdateCount(statusCode: string | undefined): number {
  switch (statusCode) {
    case "DONE":
      return getRandomInt(2, 5);
    case "UPDATED":
      return getRandomInt(1, 3);
    case "VISITED":
      return getRandomInt(1, 2);
    default:
      return getRandomInt(0, 1);
  }
}

function getHasPayment(statusCode: string | undefined): boolean {
  switch (statusCode) {
    case "DONE":
      return getRandomBoolean(0.8);
    case "UPDATED":
      return getRandomBoolean(0.5);
    case "VISITED":
      return getRandomBoolean(0.3);
    default:
      return getRandomBoolean(0.1);
  }
}

function generateRemarks(statusCode: string | undefined, reasonCode: string | undefined): string | null {
  // Only add remarks for certain statuses
  if (!["DONE", "UPDATED", "VISITED"].includes(statusCode || "")) {
    return null;
  }

  // Generate contextual remarks based on reason
  switch (reasonCode) {
    case "DECEASED":
      return "Client passed away. Family notified.";
    case "FULLY_PAID":
      return "Loan fully settled. All documents received.";
    case "CONFIRMED":
      return "Payment confirmed. Transaction verified.";
    case "NOT_REACHABLE":
      return "Multiple attempts made. No response. Will follow up next week.";
    default:
      return getRandomBoolean(0.5) ? "Follow-up scheduled" : null;
  }
}
