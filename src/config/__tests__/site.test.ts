import { describe, it, expect } from "vitest";

describe("siteConfig", () => {
  it("should have a name property", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.name).toBe("Client Updater Version 2");
  });

  it("should have a description property", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.description).toBe(
      "Client data synchronization application with integrated services",
    );
  });

  it("should have a url property", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.url).toBeDefined();
    expect(typeof siteConfig.url).toBe("string");
  });

  it("should have a links object", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.links).toBeDefined();
    expect(typeof siteConfig.links).toBe("object");
  });

  it("should have a twitter link", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.links.twitter).toBe("https://twitter.com/odvi");
  });

  it("should have a github link", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.links.github).toBe("https://github.com/odvi");
  });

  it("should have a valid URL format for url property", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.url).toMatch(/^https?:\/\/.+/);
  });

  it("should have valid URL formats for all links", () => {
    const { siteConfig } = require("../site.ts");
    expect(siteConfig.links.twitter).toMatch(/^https?:\/\/.+/);
    expect(siteConfig.links.github).toMatch(/^https?:\/\/.+/);
  });
});
