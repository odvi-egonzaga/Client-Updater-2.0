import { describe, it, expect } from "vitest";
import * as schema from "../users";

describe("Users Schema", () => {
  it("should export users table", () => {
    expect(schema.users).toBeDefined();
    expect(schema.users._.name).toBe("users");
  });

  it("should have isActive column", () => {
    const columns = Object.keys(schema.users._.columns);
    expect(columns).toContain("isActive");
  });

  it("should export permissions table", () => {
    expect(schema.permissions).toBeDefined();
    expect(schema.permissions._.name).toBe("permissions");
  });

  it("should export user_permissions junction table", () => {
    expect(schema.userPermissions).toBeDefined();
    expect(schema.userPermissions._.name).toBe("user_permissions");
  });

  it("should export user_branches junction table", () => {
    expect(schema.userBranches).toBeDefined();
    expect(schema.userBranches._.name).toBe("user_branches");
  });

  it("should export user_areas junction table", () => {
    expect(schema.userAreas).toBeDefined();
    expect(schema.userAreas._.name).toBe("user_areas");
  });
});
