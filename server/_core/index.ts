import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createServer } from "http";
import { appRouter } from "../routers";
import { registerOAuthRoutes } from "../oauth";
import { createContext } from "./context";
import { ENV, validateEnv } from "./env";
import { serveStatic, setupVite, hasDistPublic } from "./vite";

const ALLOWED_ORIGINS = (process.env.APP_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes("*")) return true;
  return ALLOWED_ORIGINS.some((allowed) => allowed === origin);
};

const keyFor = (scope: string) => (req: express.Request) => `${ipKeyGenerator(req.ip ?? "unknown")}:${scope}`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function startServer() {
  validateEnv();
  if (ENV.isProduction && !ENV.sessionSecret) throw new Error("SESSION_SECRET must be configured in production");
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.sopranova.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", ...ALLOWED_ORIGINS],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: ENV.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      frameguard: { action: "deny" },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: false }));

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor("auth"),
    message: { error: { json: { message: "Too many authentication attempts. Please try again later.", code: -32029 } } },
  });

  const intelligenceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor("intelligence"),
    message: { error: { json: { message: "Rate limit reached for AI requests. Please slow down.", code: -32029 } } },
  });

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor("general"),
  });

  registerOAuthRoutes(app);

  // Register channel adapters
  const { registerAllChannelAdapters } = await import("./channelAdapters");
  registerAllChannelAdapters();

  // Channel webhook endpoints
  const channelWebhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyFor("webhook"),
  });

  app.get("/api/webhooks/:channelType/:workspaceId", channelWebhookLimiter, async (req, res) => {
    const { channelType, workspaceId } = req.params;
    const { handleChannelWebhook } = await import("./channelAdapter");
    const result = await handleChannelWebhook(
      channelType as any,
      Number(workspaceId),
      req.query as Record<string, string>,
    );
    res.status(result.status).send(result.body);
  });

  app.post("/api/webhooks/:channelType/:workspaceId", channelWebhookLimiter, async (req, res) => {
    const { channelType, workspaceId } = req.params;
    const { handleChannelWebhook } = await import("./channelAdapter");
    const result = await handleChannelWebhook(
      channelType as any,
      Number(workspaceId),
      req.body,
    );
    res.status(result.status).send(result.body);
  });

  app.get("/manus-storage/:key(*)", async (req, res) => {
    const key = String(req.params.key ?? "").replace(/^\/+/, "");
    const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "").replace(/\/+$/, "");
    const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (!key || !forgeBaseUrl || !forgeKey) return res.status(404).end();
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(key)) return res.status(400).end();
    try {
      const presignUrl = new URL("v1/storage/presign/get", `${forgeBaseUrl}/`);
      presignUrl.searchParams.set("path", key);
      const response = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
      if (!response.ok) return res.status(502).end();
      const payload = await response.json() as { url?: string };
      if (!payload.url) return res.status(502).end();
      return res.redirect(307, payload.url);
    } catch {
      return res.status(502).end();
    }
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ error: { json: { message: "Origin not allowed", code: -32003 } } });
    }
    res.setHeader("Access-Control-Allow-Origin", origin || ALLOWED_ORIGINS[0] || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-trpc-source");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.register", authLimiter);
  app.use("/api/trpc/auth.requestPasswordReset", authLimiter);
  app.use("/api/trpc/auth.resetPassword", authLimiter);
  app.use("/api/trpc/intelligence.ask", intelligenceLimiter);
  app.use("/api/trpc", generalLimiter);

  app.post("/api/agents/chat/stream", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      const { workspaceId, agentId, conversationId, message } = req.body ?? {};
      if (!workspaceId || !agentId || !conversationId || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sessionId = req.cookies?.sopranova_session;
      if (!sessionId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { validateSession } = await import("../db");
      const session = await validateSession(sessionId);
      if (!session) {
        return res.status(401).json({ error: "Invalid session" });
      }

      const { requireDb } = await import("../db");
      const { agents, conversations, messages: messagesTable, messageSources } = await import("../../drizzle/schema");
      const { and, eq, isNull, desc } = await import("drizzle-orm");
      const db = await requireDb();

      const agent = (await db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt))).limit(1))[0];
      if (!agent) return res.status(404).json({ error: "Agent not found" });

      const conversation = (await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.workspaceId, workspaceId), isNull(conversations.deletedAt))).limit(1))[0];
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });

      await db.insert(messagesTable).values({ workspaceId, conversationId, authorUserId: session.user.id, role: "user", kind: "question", content: message });

      const { createRagContextBuilder } = await import("./contextBuilder");
      const { modelGatewayInvokeStream } = await import("./modelGateway");
      const { loadConversationHistory } = await import("./contextBuilder");

      const contextBuilder = await createRagContextBuilder();
      const history = await loadConversationHistory(workspaceId, conversationId);

      const builtContext = await contextBuilder.build({
        workspaceId, agentId, conversationId, userMessage: message, agent, history,
      });

      const { stream, model, provider } = await modelGatewayInvokeStream({
        messages: builtContext.messages,
        maxTokens: 1400,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      let fullContent = "";
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") {
                res.write(`data: [DONE]\n\n`);
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (streamError) {
        console.error("Stream error:", streamError);
      }

      await db.insert(messagesTable).values({ workspaceId, conversationId, role: "assistant", kind: "insight", content: fullContent, metadata: { model, provider, executionId: crypto.randomUUID() } });
      await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));

      res.end();
    } catch (error) {
      console.error("Stream endpoint error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream failed" });
      } else {
        res.end();
      }
    }
  });

  // ─── Help Page Route ───
  app.get("/help/:workspaceId", async (req, res) => {
    const workspaceId = Number(req.params.workspaceId);
    if (!workspaceId) return res.status(404).send("Not found");

    // Return basic help page even if database is unavailable
    const pageTitle = "Help Center";
    const description = "How can we help you?";
    const theme = "light";
    const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
    const host = req.get("host") ?? "sopranova-api.onrender.com";

    try {
      const db = await requireDb();
      const { channels: channelsTable, workspaces } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const channel = (await db
        .select()
        .from(channelsTable)
        .where(and(eq(channelsTable.workspaceId, workspaceId), eq(channelsTable.type, "help_page"), eq(channelsTable.status, "active")))
        .limit(1))[0];

      const workspace = (await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1))[0];

      const config = (channel?.configuration ?? {}) as Record<string, unknown>;
      const finalTitle = escapeHtml((config.pageTitle as string) ?? (workspace?.name ? `${workspace.name} Help Center` : pageTitle));
      const finalDescription = escapeHtml((config.description as string) ?? description);
      const finalTheme = (config.theme as string) === "dark" ? "dark" : theme;

      res.setHeader("Content-Type", "text/html");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${finalTheme === "dark" ? "#111" : "#fdfcfb"}; color: ${finalTheme === "dark" ? "#fff" : "#111"}; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
    .help-header { text-align: center; max-width: 600px; margin-bottom: 40px; }
    .help-header h1 { font-size: 32px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.02em; }
    .help-header p { font-size: 16px; color: ${finalTheme === "dark" ? "#aaa" : "#6b7280"}; line-height: 1.6; }
    .help-chat { width: 100%; max-width: 600px; flex: 1; }
  </style>
</head>
<body>
  <div class="help-header">
    <h1>${finalTitle}</h1>
    <p>${finalDescription}</p>
  </div>
  <div class="help-chat"></div>
  <script src="${proto}://${host}/embed.js" data-workspace="${workspaceId}" data-channel="widget"></script>
</body>
</html>`);
    } catch (err) {
      console.error("Help page DB error (returning default):", err instanceof Error ? err.message : String(err));
      // Still return a basic page even if DB query fails
      res.setHeader("Content-Type", "text/html");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fdfcfb; color: #111; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 48px 24px; }
    .help-header { text-align: center; max-width: 600px; margin-bottom: 40px; }
    .help-header h1 { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
    .help-header p { font-size: 16px; color: #6b7280; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="help-header">
    <h1>${pageTitle}</h1>
    <p>${description}</p>
  </div>
  <div class="help-chat"></div>
  <script src="${proto}://${host}/embed.js" data-workspace="${workspaceId}" data-channel="widget"></script>
</body>
</html>`);
    }
  });

  // ─── API Channel Endpoint ───
  app.post("/api/v1/agent/:agentId/chat", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      const agentId = Number(req.params.agentId);
      const { message, conversationId } = req.body ?? {};
      if (!agentId || !message) {
        return res.status(400).json({ error: "Missing agentId or message" });
      }

      // Authenticate via API key
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer sk_live_..." });
      }
      const apiKey = authHeader.slice(7);

      const { validateApiKey } = await import("./apiKeys");
      const keyResult = await validateApiKey(apiKey);
      if (!keyResult) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      const workspaceId = keyResult.workspaceId;

      const db = await requireDb();
      const { agents: agentsTable, conversations: convTable, messages: msgTable } = await import("../../drizzle/schema");
      const { and, eq, isNull } = await import("drizzle-orm");

      // Verify agent exists and belongs to this workspace
      const agent = (await db
        .select()
        .from(agentsTable)
        .where(and(eq(agentsTable.id, agentId), eq(agentsTable.workspaceId, workspaceId), isNull(agentsTable.deletedAt)))
        .limit(1))[0];
      if (!agent) return res.status(404).json({ error: "Agent not found in this workspace" });

      // Find or create conversation
      let convId = conversationId;
      if (!convId) {
        const [conv] = await db.insert(convTable).values({
          workspaceId,
          title: `api:agent-${agentId}`,
          createdById: keyResult.userId ?? 1,
        }).returning({ id: convTable.id });
        convId = conv.id;
      }

      // Save user message
      await db.insert(msgTable).values({
        workspaceId,
        conversationId: convId,
        role: "user",
        kind: "question",
        content: message,
        metadata: { source: "api", agentId },
      });

      // Run agent
      const { AgentRuntime } = await import("./agentRuntime");
      const runtime = new AgentRuntime({ maxTokens: 2048 });
      const result = await runtime.execute({
        workspaceId,
        agentId,
        conversationId: convId,
        userId: keyResult.userId ?? 1,
        message,
      });

      // Save assistant response
      await db.insert(msgTable).values({
        workspaceId,
        conversationId: convId,
        role: "assistant",
        kind: "answer",
        content: result.response,
        metadata: { model: result.model, provider: result.provider, latencyMs: result.latencyMs, source: "api" },
      });

      await db.update(convTable).set({ lastMessageAt: new Date() }).where(eq(convTable.id, convId));

      res.json({
        reply: result.response,
        conversationId: convId,
        model: result.model,
        latencyMs: result.latencyMs,
      });
    } catch (err) {
      console.error("API agent chat error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (hasDistPublic()) {
    serveStatic(app);
  } else if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    console.warn("No dist/public found and not in development mode. API-only mode.");
  }

  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, process.env.HOST ?? "0.0.0.0", () => {
    console.info(`SOPRANOVA API listening on http://localhost:${port}`);
    // Only spawn worker if not running as separate service (Render sets WORKER_ID)
    const isWorkerSeparateService = !!process.env.WORKER_ID;
    if (!isWorkerSeparateService && (ENV.isProduction || process.env.ENABLE_WORKER === "1")) {
      const workerPath = path.resolve(import.meta.dirname, "../../dist/worker.js");
      const worker = spawn(process.execPath, [workerPath], {
        stdio: "inherit",
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "production" },
        detached: false,
      });
      worker.on("error", (err) => console.error(JSON.stringify({ event: "worker.process_error", error: err.message })));
      worker.on("exit", (code) => console.warn(JSON.stringify({ event: "worker.process_exit", code })));
      console.info(JSON.stringify({ event: "worker.spawned", pid: worker.pid }));
    }
  });
}

// Global error handlers
process.on("unhandledRejection", (reason) => {
  console.error(JSON.stringify({ event: "unhandled_rejection", reason: reason instanceof Error ? reason.message : String(reason) }));
});
process.on("uncaughtException", (error) => {
  console.error(JSON.stringify({ event: "uncaught_exception", error: error.message, stack: error.stack }));
  process.exit(1);
});

startServer().catch(error => {
  console.error("SOPRANOVA server failed to start", error);
  process.exit(1);
});
