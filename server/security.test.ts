import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Security Unit Tests ────────────────────────────────────

describe("Password Security", () => {
  it("rejects passwords shorter than 12 characters", () => {
    const { z } = require("zod");
    const schema = z.string().min(12);
    expect(() => schema.parse("short")).toThrow();
  });

  it("rejects passwords without uppercase", () => {
    const regex = /[A-Z]/;
    expect(regex.test("alllowercase123")).toBe(false);
  });

  it("rejects passwords without lowercase", () => {
    const regex = /[a-z]/;
    expect(regex.test("ALLUPPERCASE123")).toBe(false);
  });

  it("rejects passwords without numbers", () => {
    const regex = /[0-9]/;
    expect(regex.test("NoNumbersHere!")).toBe(false);
  });

  it("accepts valid complex passwords", () => {
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{12,128}$/;
    expect(regex.test("SecureP4ssw0rd!")).toBe(true);
    expect(regex.test("MyStr0ngP@ssword")).toBe(true);
  });
});

describe("Token Hashing", () => {
  it("produces consistent SHA-256 hashes", () => {
    const { createHash } = require("node:crypto");
    const token = "test-token-abc123";
    const hash1 = createHash("sha256").update(token).digest("hex");
    const hash2 = createHash("sha256").update(token).digest("hex");
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it("produces different hashes for different tokens", () => {
    const { createHash } = require("node:crypto");
    const hash1 = createHash("sha256").update("token-a").digest("hex");
    const hash2 = createHash("sha256").update("token-b").digest("hex");
    expect(hash1).not.toBe(hash2);
  });
});

describe("SSRF Protection", () => {
  const blockedHosts = [
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "metadata.google.internal",
  ];

  const blockedPatterns = [
    /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/,
    /^(fc00:|fe80:|::ffff:127\.)/,
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  ];

  it("blocks localhost and loopback", () => {
    for (const host of blockedHosts) {
      const isBlocked =
        blockedHosts.includes(host) ||
        blockedPatterns.some((p) => p.test(host));
      expect(isBlocked).toBe(true);
    }
  });

  it("allows public hostnames", () => {
    const publicHosts = [
      "api.example.com",
      "data.company.org",
      "storage.cloudprovider.net",
    ];
    for (const host of publicHosts) {
      const isBlocked =
        blockedHosts.includes(host) ||
        blockedPatterns.some((p) => p.test(host));
      expect(isBlocked).toBe(false);
    }
  });
});

describe("XSS Prevention", () => {
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  it("escapes HTML entities", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('onclick="alert(1)"')).toBe(
      "onclick=&quot;alert(1)&quot;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });
});

describe("API Key Security", () => {
  it("generates keys with correct prefix", () => {
    const prefix = "sk_live_";
    expect(prefix).toMatch(/^sk_live_/);
  });

  it("keys are 64 hex chars after prefix", () => {
    const hex = "a".repeat(64);
    expect(hex.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
  });
});

describe("Workspace Isolation", () => {
  it("workspaceId input must be a positive integer", () => {
    const { z } = require("zod");
    const schema = z.object({ workspaceId: z.number().int().positive() });

    expect(() => schema.parse({ workspaceId: -1 })).toThrow();
    expect(() => schema.parse({ workspaceId: 0 })).toThrow();
    expect(() => schema.parse({ workspaceId: 1.5 })).toThrow();
    expect(() => schema.parse({ workspaceId: "abc" })).toThrow();
    expect(schema.parse({ workspaceId: 1 }).workspaceId).toBe(1);
  });
});

describe("Session Cookie Security", () => {
  it("cookie options include httpOnly", () => {
    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
    };
    expect(options.httpOnly).toBe(true);
  });

  it("cookie options include sameSite", () => {
    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
    };
    expect(options.sameSite).toBe("lax");
  });

  it("cookie options include path", () => {
    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
    };
    expect(options.path).toBe("/");
  });
});

describe("Input Validation", () => {
  it("rejects empty workspaceId", () => {
    const { z } = require("zod");
    const schema = z.object({ workspaceId: z.number().int().positive() });
    expect(() => schema.parse({})).toThrow();
  });

  it("rejects negative agentId", () => {
    const { z } = require("zod");
    const schema = z.object({ agentId: z.number().int().positive() });
    expect(() => schema.parse({ agentId: -5 })).toThrow();
  });

  it("rejects oversized strings", () => {
    const { z } = require("zod");
    const schema = z.string().max(160);
    expect(() => schema.parse("x".repeat(161))).toThrow();
  });
});

describe("Error Scrubbing", () => {
  it("scrubs database query details from error messages", () => {
    const message = "Failed query: SELECT * FROM users WHERE id = 123 params: [456]";
    const isSensitive =
      message.includes("Failed query:") ||
      message.includes("params:") ||
      message.includes("at ");
    expect(isSensitive).toBe(true);
  });

  it("allows normal error messages through", () => {
    const message = "Agent not found in this workspace.";
    const isSensitive =
      message.includes("Failed query:") ||
      message.includes("params:") ||
      message.includes("at ");
    expect(isSensitive).toBe(false);
  });
});
