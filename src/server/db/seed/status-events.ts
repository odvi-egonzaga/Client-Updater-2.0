import { db } from "@/server/db";
import { statusEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  SEED_CONFIG,
  getRandomInt,
  getRandomItem,
  getDateBetween,
} from "./helpers";

export async function seedStatusEvents(
  clientStatusesData: any[],
  usersData: any[]
) {
  console.log("Seeding status events...");

  const statusEventsToCreate: typeof statusEvents.$inferInsert[] = [];

  // Create status events for each client period status
  clientStatusesData.forEach((clientStatus) => {
    const numEvents = getRandomInt(
      SEED_CONFIG.statusEventsPerClient.min,
      SEED_CONFIG.statusEventsPerClient.max
    );

    // Create events showing logical progression
    const events = createStatusEventSequence(
      clientStatus,
      numEvents,
      usersData
    );

    statusEventsToCreate.push(...events);
  });

  if (statusEventsToCreate.length > 0) {
    await db.insert(statusEvents).values(statusEventsToCreate).onConflictDoNothing();
    console.log(`  - ${statusEventsToCreate.length} status events seeded`);
  } else {
    console.log(`  - No status events to seed`);
  }

  console.log("Status events seeded successfully!");

  return statusEventsToCreate;
}

function createStatusEventSequence(
  clientStatus: any,
  numEvents: number,
  usersData: any[]
): typeof statusEvents.$inferInsert[] {
  const events: typeof statusEvents.$inferInsert[] = [];

  // Define status progression based on current status
  const statusProgression = getStatusProgression(clientStatus.statusTypeId);

  // Create events in reverse chronological order (oldest first)
  for (let i = 0; i < numEvents; i++) {
    const eventIndex = Math.floor(
      (i / numEvents) * statusProgression.length
    );
    const statusType = statusProgression[Math.min(eventIndex, statusProgression.length - 1)];

    // Calculate event timestamp (older events first)
    const eventDate = getEventDate(clientStatus.createdAt, i, numEvents);

    const event = createStatusEvent(
      clientStatus.id,
      statusType,
      usersData,
      eventDate,
      i + 1
    );

    events.push(event);
  }

  return events;
}

function getStatusProgression(currentStatusTypeId: string): any[] {
  // Define logical status progressions
  // This is a simplified version - in production, you'd look up actual status types

  const progressions = [
    // PENDING -> TO_FOLLOW -> CALLED -> VISITED -> UPDATED -> DONE
    [
      { code: "PENDING", sequence: 1 },
      { code: "TO_FOLLOW", sequence: 2 },
      { code: "CALLED", sequence: 3 },
      { code: "VISITED", sequence: 4 },
      { code: "UPDATED", sequence: 5 },
      { code: "DONE", sequence: 6 },
    ],
    // PENDING -> TO_FOLLOW -> UPDATED -> DONE
    [
      { code: "PENDING", sequence: 1 },
      { code: "TO_FOLLOW", sequence: 2 },
      { code: "UPDATED", sequence: 3 },
      { code: "DONE", sequence: 4 },
    ],
    // PENDING -> CALLED -> DONE
    [
      { code: "PENDING", sequence: 1 },
      { code: "CALLED", sequence: 2 },
      { code: "DONE", sequence: 3 },
    ],
  ];

  // Return a random progression
  return getRandomItem(progressions);
}

function getEventDate(baseDate: Date, eventIndex: number, totalEvents: number): Date {
  // Calculate how many days before the base date this event occurred
  const daysBefore = Math.floor(((totalEvents - eventIndex) / totalEvents) * 30);

  const eventDate = new Date(baseDate);
  eventDate.setDate(eventDate.getDate() - daysBefore);

  return eventDate;
}

function createStatusEvent(
  clientPeriodStatusId: string,
  statusType: any,
  usersData: any[],
  createdAt: Date,
  eventSequence: number
): typeof statusEvents.$inferInsert {
  const createdBy = getRandomItem(usersData);

  return {
    clientPeriodStatusId,
    statusTypeId: statusType.id,
    reasonId: null, // Reasons only for DONE status
    remarks: null,
    hasPayment: false,
    eventSequence,
    createdBy: createdBy?.id,
    createdAt,
  };
}
