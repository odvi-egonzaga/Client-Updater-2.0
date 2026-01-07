import { describe, it, expect } from "vitest";
import * as clients from "../clients";

describe("Clients Schema", () => {
  it("should export clients table", () => {
    expect(clients.clients).toBeDefined();
    expect(clients.clients._.name).toBe("clients");
  });

  it("should export client_period_status table", () => {
    expect(clients.clientPeriodStatus).toBeDefined();
    expect(clients.clientPeriodStatus._.name).toBe("client_period_status");
  });

  it("should export status_events table", () => {
    expect(clients.statusEvents).toBeDefined();
    expect(clients.statusEvents._.name).toBe("status_events");
  });

  it("should have required client columns", () => {
    const columns = Object.keys(clients.clients._.columns);
    expect(columns).toContain("clientCode");
    expect(columns).toContain("fullName");
    expect(columns).toContain("branchId");
    expect(columns).toContain("pensionTypeId");
    expect(columns).toContain("syncSource");
  });
});
