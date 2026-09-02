import { describe, it, expect } from "vitest";
import {
  CHANNEL_REGISTRY,
  getChannelById,
  getAvailableChannels,
  getChannelsByCategory,
  searchChannels,
  mergeRegistryWithDb,
  type ChannelType,
} from "./channelRegistry";

describe("channelRegistry", () => {
  const allTypes: ChannelType[] = [
    "widget", "help_page", "center_stage", "messenger",
    "whatsapp", "instagram", "slack", "email", "sms", "voice",
    "api", "shopify", "zendesk", "salesforce", "wordpress", "zapier",
    "android-sdk", "ios-sdk",
  ];

  it("exports all 18 channel definitions", () => {
    expect(CHANNEL_REGISTRY).toHaveLength(18);
    const ids = CHANNEL_REGISTRY.map((c) => c.id);
    for (const type of allTypes) {
      expect(ids).toContain(type);
    }
  });

  it("getChannelById returns correct channel", () => {
    const widget = getChannelById("widget");
    expect(widget).toBeDefined();
    expect(widget!.name).toBe("Chat Bubble");
    expect(widget!.category).toBe("featured");
    expect(widget!.isClientSide).toBe(true);
  });

  it("getChannelById returns undefined for unknown type", () => {
    expect(getChannelById("unknown" as ChannelType)).toBeUndefined();
  });

  it("getAvailableChannels returns only available channels", () => {
    const available = getAvailableChannels();
    expect(available.length).toBeGreaterThan(0);
    for (const ch of available) {
      expect(ch.status).toBe("available");
    }
    expect(available.map((c) => c.id)).toContain("widget");
    expect(available.map((c) => c.id)).toContain("email");
    expect(available.map((c) => c.id)).toContain("api");
  });

  it("getChannelsByCategory returns correct channels", () => {
    const featured = getChannelsByCategory("featured");
    expect(featured.length).toBe(3);
    expect(featured.map((c) => c.id)).toContain("widget");
    expect(featured.map((c) => c.id)).toContain("help_page");
    expect(featured.map((c) => c.id)).toContain("center_stage");
  });

  it("searchChannels matches by name", () => {
    const results = searchChannels("chat");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((c) => c.id === "widget")).toBe(true);
  });

  it("searchChannels matches by id", () => {
    const results = searchChannels("help_page");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("help_page");
  });

  it("searchChannels matches by category", () => {
    const results = searchChannels("ecommerce");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("shopify");
  });

  it("searchChannels is case-insensitive", () => {
    const results = searchChannels("WHATSAPP");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("whatsapp");
  });

  it("searchChannels returns all when empty query", () => {
    const results = searchChannels("");
    expect(results).toHaveLength(18);
  });

  it("mergeRegistryWithDb merges DB state into registry", () => {
    const mockDbChannels = [
      {
        type: "widget" as ChannelType,
        status: "active" as const,
        configuration: { agentId: 5, greeting: "Hi!" },
        id: 1,
      },
      {
        type: "whatsapp" as ChannelType,
        status: "draft" as const,
        configuration: { phoneNumber: "+1234567890" },
        id: 2,
      },
    ];

    const merged = mergeRegistryWithDb(mockDbChannels);
    expect(merged).toHaveLength(18);

    const widget = merged.find((c) => c.id === "widget")!;
    expect(widget.configured).toBe(true);
    expect(widget.channelStatus).toBe("active");
    expect(widget.config?.greeting).toBe("Hi!");

    const whatsapp = merged.find((c) => c.id === "whatsapp")!;
    expect(whatsapp.configured).toBe(true);
    expect(whatsapp.channelStatus).toBe("draft");

    // Non-configured channel defaults to "draft"
    const slack = merged.find((c) => c.id === "slack")!;
    expect(slack.configured).toBe(false);
    expect(slack.channelStatus).toBe("draft");
  });

  it("every channel has required fields", () => {
    for (const ch of CHANNEL_REGISTRY) {
      expect(ch.id).toBeTruthy();
      expect(ch.name).toBeTruthy();
      expect(ch.description).toBeTruthy();
      expect(ch.category).toBeTruthy();
      expect(ch.icon).toBeTruthy();
      expect(ch.accent).toBeTruthy();
      expect(["featured", "messaging", "support", "integration", "development", "ecommerce"]).toContain(ch.category);
      expect(["available", "coming_soon", "beta"]).toContain(ch.status);
      expect(typeof ch.isClientSide).toBe("boolean");
      expect(typeof ch.requiresConnection).toBe("boolean");
      expect(Array.isArray(ch.configFields)).toBe(true);
      expect(ch.actions).toBeDefined();
    }
  });

  it("coming_soon channels have empty actions", () => {
    const comingSoon = CHANNEL_REGISTRY.filter((c) => c.status === "coming_soon");
    expect(comingSoon.length).toBeGreaterThan(0);
    for (const ch of comingSoon) {
      expect(Object.keys(ch.actions).length).toBe(0);
    }
  });

  it("configFields have valid structure", () => {
    for (const ch of CHANNEL_REGISTRY) {
      for (const field of ch.configFields) {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(["text", "password", "number", "select", "textarea", "toggle"]).toContain(field.type);
        if (field.options) {
          expect(field.options.length).toBeGreaterThan(0);
          for (const opt of field.options) {
            expect(opt.label).toBeTruthy();
            expect(opt.value).toBeTruthy();
          }
        }
      }
    }
  });
});
