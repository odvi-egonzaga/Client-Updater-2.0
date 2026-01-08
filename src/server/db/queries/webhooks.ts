import { db } from "../index";
import { webhookEvents } from "../schema/webhooks";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Check if a webhook event has already been processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    logger.error("Failed to check if event was processed", error as Error, {
      action: "check_event_processed",
      eventId,
    });
    throw error;
  }
}

/**
 * Mark a webhook event as processed
 */
export async function markEventProcessed(
  eventId: string,
  eventType: string,
  payload: unknown,
) {
  try {
    const result = await db
      .insert(webhookEvents)
      .values({
        eventId,
        eventType,
        payload: payload as any,
      })
      .returning();

    logger.info("Marked webhook event as processed", {
      action: "mark_event_processed",
      eventId,
      eventType,
    });

    return result[0];
  } catch (error) {
    logger.error("Failed to mark event as processed", error as Error, {
      action: "mark_event_processed",
      eventId,
      eventType,
    });
    throw error;
  }
}
