import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../index";
import { webhookEvents } from "../../schema/webhooks";
import { eq } from "drizzle-orm";
import {
  isEventProcessed,
  markEventProcessed,
} from "../webhooks";

describe("Webhook Event Idempotency", () => {
  const testEventId = "test_event_id_123";
  const testEventType = "user.created";
  const testPayload = { data: "test data" };

  beforeEach(async () => {
    // Clean up any existing test data
    await db
      .delete(webhookEvents)
      .where(eq(webhookEvents.eventId, testEventId));
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db
      .delete(webhookEvents)
      .where(eq(webhookEvents.eventId, testEventId));
  });

  it("should return false for a non-processed event", async () => {
    const isProcessed = await isEventProcessed(testEventId);
    expect(isProcessed).toBe(false);
  });

  it("should mark an event as processed", async () => {
    await markEventProcessed(testEventId, testEventType, testPayload);

    const isProcessed = await isEventProcessed(testEventId);
    expect(isProcessed).toBe(true);
  });

  it("should store the event details correctly", async () => {
    await markEventProcessed(testEventId, testEventType, testPayload);

    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, testEventId));

    expect(events.length).toBe(1);
    expect(events[0].eventId).toBe(testEventId);
    expect(events[0].eventType).toBe(testEventType);
    expect(events[0].payload).toEqual(testPayload);
    expect(events[0].processedAt).toBeDefined();
  });

  it("should return true for an already processed event", async () => {
    // Mark as processed first
    await markEventProcessed(testEventId, testEventType, testPayload);

    // Check again
    const isProcessed = await isEventProcessed(testEventId);
    expect(isProcessed).toBe(true);
  });
});
