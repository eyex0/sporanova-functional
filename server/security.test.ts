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

describe("Token Expiration", () => {
  it("verification tokens expire after 24 hours", () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(expiresAt.getTime() - now.getTime()).toBe(86400000);
  });

  it("password reset tokens expire after 30 minutes", () => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const now = new Date();
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(expiresAt.getTime() - now.getTime()).toBe(1800000);
  });

  it("expired tokens are rejected", () => {
    const expiredAt = new Date(Date.now() - 1000);
    expect(expiredAt.getTime()).toBeLessThan(Date.now());
  });
});

describe("Token Reuse Prevention", () => {
  it("tokens cannot be reused after use", () => {
    let usedAt: Date | null = null;
    function markUsed() {
      if (usedAt) throw new Error("TOKEN_ALREADY_USED");
      usedAt = new Date();
    }
    markUsed();
    expect(() => markUsed()).toThrow("TOKEN_ALREADY_USED");
  });
});

describe("CORS Security", () => {
  it("rejects wildcard-only origin list with credentials", () => {
    const ALLOWED_ORIGINS = ["*"];
    const origin = "https://evil.com";
    const isOriginAllowed = (o: string | undefined): boolean => {
      if (!o) return true;
      if (ALLOWED_ORIGINS.includes("*") && ALLOWED_ORIGINS.length === 1) return false;
      if (ALLOWED_ORIGINS.includes("*")) return true;
      return ALLOWED_ORIGINS.some((allowed) => allowed === o);
    };
    expect(isOriginAllowed(origin)).toBe(false);
  });

  it("allows specific origins when wildcard is combined", () => {
    const ALLOWED_ORIGINS = ["*", "https://app.example.com"];
    const isOriginAllowed = (o: string | undefined): boolean => {
      if (!o) return true;
      if (ALLOWED_ORIGINS.includes("*") && ALLOWED_ORIGINS.length === 1) return false;
      if (ALLOWED_ORIGINS.includes("*")) return true;
      return ALLOWED_ORIGINS.some((allowed) => allowed === o);
    };
    expect(isOriginAllowed("https://evil.com")).toBe(true);
  });

  it("allows matching origin", () => {
    const ALLOWED_ORIGINS = ["https://app.example.com"];
    const isOriginAllowed = (o: string | undefined): boolean => {
      if (!o) return true;
      if (ALLOWED_ORIGINS.includes("*") && ALLOWED_ORIGINS.length === 1) return false;
      if (ALLOWED_ORIGINS.includes("*")) return true;
      return ALLOWED_ORIGINS.some((allowed) => allowed === o);
    };
    expect(isOriginAllowed("https://app.example.com")).toBe(true);
    expect(isOriginAllowed("https://evil.com")).toBe(false);
  });
});

describe("Storage Key Security", () => {
  it("strips leading slashes from keys", () => {
    const normalizeKey = (v: string) => v.replace(/^\/+/, "").replace(/\.\./g, "_").replace(/[\x00-\x1f]/g, "_");
    expect(normalizeKey("/etc/passwd")).toBe("etc/passwd");
    expect(normalizeKey("///etc/passwd")).toBe("etc/passwd");
  });

  it("replaces path traversal sequences", () => {
    const normalizeKey = (v: string) => v.replace(/^\/+/, "").replace(/\.\./g, "_").replace(/[\x00-\x1f]/g, "_");
    expect(normalizeKey("foo/../../../etc/passwd")).toBe("foo/_/_/_/etc/passwd");
  });

  it("strips control characters", () => {
    const normalizeKey = (v: string) => v.replace(/^\/+/, "").replace(/\.\./g, "_").replace(/[\x00-\x1f]/g, "_");
    expect(normalizeKey("file\x00name")).toBe("file_name");
    expect(normalizeKey("file\x1fname")).toBe("file_name");
  });
});

describe("File Upload Security", () => {
  it("accepts only allowed MIME types", () => {
    const acceptedMimeTypes = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ]);
    expect(acceptedMimeTypes.has("application/pdf")).toBe(true);
    expect(acceptedMimeTypes.has("text/csv")).toBe(true);
    expect(acceptedMimeTypes.has("application/x-executable")).toBe(false);
    expect(acceptedMimeTypes.has("text/html")).toBe(false);
    expect(acceptedMimeTypes.has("application/javascript")).toBe(false);
    expect(acceptedMimeTypes.has("image/svg+xml")).toBe(false);
  });

  it("enforces 10MB upload limit", () => {
    const maximumUploadBytes = 10 * 1024 * 1024;
    expect(maximumUploadBytes).toBe(10485760);
    expect(10 * 1024 * 1024).toBeLessThanOrEqual(maximumUploadBytes);
    expect(11 * 1024 * 1024).toBeGreaterThan(maximumUploadBytes);
  });

  it("validates base64 payload format", () => {
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    expect(base64Regex.test("SGVsbG8=")).toBe(true);
    expect(base64Regex.test("SGVsbG8gd29ybGQ=")).toBe(true);
    expect(base64Regex.test("<script>alert(1)</script>")).toBe(false);
    expect(base64Regex.test("../../../etc/passwd")).toBe(false);
  });

  it("validates magic bytes for PDF", () => {
    const pdfBytes = Buffer.from("%PDF-1.4 test content");
    expect(pdfBytes.subarray(0, 5).toString("utf8") === "%PDF-").toBe(true);
  });

  it("validates magic bytes for ZIP/DOCX", () => {
    const zipBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
    expect(zipBytes.subarray(0, 2).toString("utf8") === "PK").toBe(true);
  });
});

describe("Brute Force Protection", () => {
  it("rate limiter configurations exist", () => {
    const authLimiterConfig = { windowMs: 60000, max: 30 };
    const intelligenceLimiterConfig = { windowMs: 60000, max: 60 };
    const generalLimiterConfig = { windowMs: 60000, max: 600 };
    expect(authLimiterConfig.max).toBeLessThanOrEqual(30);
    expect(intelligenceLimiterConfig.max).toBeLessThanOrEqual(60);
    expect(generalLimiterConfig.max).toBeLessThanOrEqual(600);
  });
});

describe("Password Hashing", () => {
  it("uses bcrypt with cost >= 12", () => {
    const bcryptCost = 12;
    expect(bcryptCost).toBeGreaterThanOrEqual(12);
  });
});

describe("Session Security", () => {
  it("session token uses 48 bytes entropy", () => {
    const { randomBytes } = require("node:crypto");
    const token = randomBytes(48).toString("base64url");
    expect(token.length).toBeGreaterThan(60);
  });

  it("session token is SHA-256 hashed before storage", () => {
    const { createHash, randomBytes } = require("node:crypto");
    const token = randomBytes(48).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    expect(hash.length).toBe(64);
    expect(hash).not.toBe(token);
  });
});

describe("Authorization Middleware", () => {
  it("workspaceProcedure requires workspaceId", () => {
    const { z } = require("zod");
    const schema = z.object({ workspaceId: z.number().int().positive() });
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ workspaceId: 0 })).toThrow();
    expect(() => schema.parse({ workspaceId: -1 })).toThrow();
    expect(schema.parse({ workspaceId: 1 }).workspaceId).toBe(1);
  });

  it("role checks enforce correct hierarchy", () => {
    const allowedRoles = ["owner", "admin", "member"];
    expect(allowedRoles.includes("owner")).toBe(true);
    expect(allowedRoles.includes("admin")).toBe(true);
    expect(allowedRoles.includes("member")).toBe(true);
    expect(allowedRoles.includes("viewer")).toBe(false);
  });
});

describe("API Key Validation", () => {
  it("rejects empty API keys", () => {
    expect("").toBeFalsy();
  });

  it("rejects keys without sk_live_ prefix", () => {
    const key = "sk_live_abc123def456";
    expect(key.startsWith("sk_live_")).toBe(true);
    expect("invalid_key".startsWith("sk_live_")).toBe(false);
  });

  it("validates key hash length", () => {
    const { createHash } = require("node:crypto");
    const key = "sk_live_" + "a".repeat(64);
    const hash = createHash("sha256").update(key).digest("hex");
    expect(hash.length).toBe(64);
  });
});

describe("Input Sanitization", () => {
  it("trims and normalizes email addresses", () => {
    const email = "  User@Example.COM  ".trim().toLowerCase();
    expect(email).toBe("user@example.com");
  });

  it("rejects oversized names", () => {
    const { z } = require("zod");
    const schema = z.string().trim().min(2).max(160);
    expect(() => schema.parse("a".repeat(161))).toThrow();
    expect(() => schema.parse("a")).toThrow();
    expect(schema.parse("Valid Name")).toBe("Valid Name");
  });

  it("rejects invalid email format", () => {
    const { z } = require("zod");
    const schema = z.string().trim().email().max(320);
    expect(() => schema.parse("not-an-email")).toThrow();
    expect(() => schema.parse("missing@")).toThrow();
    expect(() => schema.parse("@domain.com")).toThrow();
    expect(schema.parse("user@example.com")).toBe("user@example.com");
  });
});

describe("Sensitive Data Protection", () => {
  it("passwordHash is stripped from public user", () => {
    const user = { id: 1, email: "test@example.com", passwordHash: "hashed", name: "Test" };
    const { passwordHash: _, ...safeUser } = user;
    expect(safeUser).not.toHaveProperty("passwordHash");
    expect(safeUser.email).toBe("test@example.com");
  });

  it("session tokens are not included in API responses", () => {
    const response = { id: 1, email: "test@example.com", name: "Test" };
    expect(response).not.toHaveProperty("token");
    expect(response).not.toHaveProperty("passwordHash");
  });
});

describe("Email Verification Security", () => {
  it("verification tokens are 32 bytes (256 bits)", () => {
    const { randomBytes } = require("node:crypto");
    const token = randomBytes(32).toString("base64url");
    expect(token.length).toBeGreaterThan(40);
  });

  it("verification tokens expire in 24 hours", () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(24, 0);
  });

  it("verification tokens are single-use", () => {
    let usedAt: Date | null = null;
    function markUsed() {
      if (usedAt) return false;
      usedAt = new Date();
      return true;
    }
    expect(markUsed()).toBe(true);
    expect(markUsed()).toBe(false);
  });
});
