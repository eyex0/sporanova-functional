import "dotenv/config";
import { fork } from "node:child_process";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createServer } from "http";
import { appRouter } from "../routers";
import { registerOAuthRoutes } from "../oauth";
import { createContext } from "./context";
import { ENV } from "./env";
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

async function startServer() {
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
    if (ENV.isProduction || process.env.ENABLE_WORKER === "1") {
      const workerPath = path.resolve(import.meta.dirname, "../../dist/worker.js");
      const worker = fork(workerPath, { stdio: "inherit", env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "production" } });
      worker.on("error", (err) => console.error(JSON.stringify({ event: "worker.process_error", error: err.message })));
      worker.on("exit", (code) => console.warn(JSON.stringify({ event: "worker.process_exit", code })));
      console.info(JSON.stringify({ event: "worker.forked", pid: worker.pid }));
    }
  });
}

startServer().catch(error => {
  console.error("SOPRANOVA server failed to start", error);
  process.exit(1);
});
