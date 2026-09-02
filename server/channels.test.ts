import { describe, it, expect } from "vitest";
import { CHANNEL_REGISTRY, getChannelById } from "./_core/channelRegistry";
import type { ChannelType } from "./_core/channelRegistry";

describe("channels router (registry-only, no DB)", () => {
  it("registry has all 18 channel definitions", () => {
    expect(CHANNEL_REGISTRY).toHaveLength(18);
  });

  it("registry has client-side channels for embed", () => {
    const clientSide = CHANNEL_REGISTRY.filter((c) => c.isClientSide);
    expect(clientSide.length).toBe(3);
    expect(clientSide.map((c) => c.id)).toContain("widget");
    expect(clientSide.map((c) => c.id)).toContain("help_page");
    expect(clientSide.map((c) => c.id)).toContain("center_stage");
  });

  it("available channels have configure action", () => {
    const available = CHANNEL_REGISTRY.filter((c) => c.status === "available");
    expect(available.length).toBeGreaterThan(0);
    for (const ch of available) {
      expect(ch.actions.configure).toBe(true);
    }
  });

  it("coming_soon channels have no actions", () => {
    const comingSoon = CHANNEL_REGISTRY.filter((c) => c.status === "coming_soon");
    expect(comingSoon.length).toBe(11);
    for (const ch of comingSoon) {
      expect(Object.keys(ch.actions).length).toBe(0);
    }
  });

  it("widget channel has agent selection config field", () => {
    const widget = getChannelById("widget")!;
    expect(widget.configFields.some((f) => f.key === "agentId")).toBe(true);
  });

  it("email channel requires connection", () => {
    const email = getChannelById("email")!;
    expect(email.requiresConnection).toBe(true);
    expect(email.actions.connect).toBe(true);
    expect(email.actions.disconnect).toBe(true);
  });

  it("api channel does not require connection", () => {
    const api = getChannelById("api")!;
    expect(api.requiresConnection).toBe(false);
    expect(api.isClientSide).toBe(false);
  });
});
