import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { createServer } from "http";
import { appRouter } from "../routers";
import { registerOAuthRoutes } from "../oauth";
import { createContext } from "./context";
import { ENV } from "./env";
import { serveStatic, setupVite, hasDistPublic } from "./vite";

async function startServer() {
  if (ENV.isProduction && !ENV.sessionSecret) throw new Error("SESSION_SECRET must be configured in production");
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ limit: "12mb", extended: false }));
  registerOAuthRoutes(app);
  app.get("/manus-storage/:key(*)", async (req, res) => {
    const key = String(req.params.key ?? "").replace(/^\/+/, "");
    const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "").replace(/\/+$/, "");
    const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (!key || !forgeBaseUrl || !forgeKey) return res.status(404).end();
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
    const origin = req.headers.origin || (req.headers.host ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}` : process.env.APP_ORIGIN || "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
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
  });
}

startServer().catch(error => {
  console.error("SOPRANOVA server failed to start", error);
  process.exit(1);
});
