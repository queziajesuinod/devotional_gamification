import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createAuthRouter } from "../auth-routes";
import { checkRedisHealth } from "../redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ✅ crucial atrás do Traefik (HTTPS termina no proxy)
  app.set("trust proxy", 1);

  // (Opcional) tira header
  app.disable("x-powered-by");

  // CORS (se front e api estiverem no MESMO domínio, dá pra remover depois)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) res.header("Access-Control-Allow-Origin", origin);

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // -------------------------
  // API ROUTES (mantém /api)
  // -------------------------
  registerOAuthRoutes(app);

  const authRouter = createAuthRouter();
  app.use("/api/auth", authRouter);

  app.get("/api/health", async (_req, res) => {
    const redisHealthy = await checkRedisHealth();
    res.json({
      ok: true,
      timestamp: Date.now(),
      redis: redisHealthy ? "connected" : "disconnected",
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // -------------------------
  // WEB (Expo export) - /web-dist
  // -------------------------
  // dist/index.js fica em /app/dist, então ../web-dist => /app/web-dist
  const webDir = path.resolve(__dirname, "../web-dist");
  // Serve arquivos estáticos (assets, js, css)
  app.use(express.static(webDir));

  // Fallback SPA (React Router etc.), sem mexer em /api
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return res.sendFile(path.join(webDir, "index.html"));
  });

  // ✅ PORTA FIXA (nada de procurar outra porta em container)
  const port = parseInt(process.env.PORT || "3009", 10);
  const host = process.env.HOST || "0.0.0.0";

  server.listen(port, host, () => {
    console.log(`[api] server listening on http://${host}:${port}`);
    console.log(`[web] serving static from ${webDir}`);
  });
}

startServer().catch(console.error);
