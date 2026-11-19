import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cryptoRouter from "./src/routes/crypto.js";
import mlRouter from "./src/routes/ml.js";
import paperRouter from "./src/routes/paper.js";
import alertsRouter from "./src/routes/alerts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3002;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      database: process.env.MONGODB_URI ? "Configured" : "Missing MONGODB_URI",
      serverTime: new Date().toISOString(),
    });
  });

  // Feature routers (identical to Vercel Serverless api/index.ts)
  app.use("/api/crypto", cryptoRouter);
  app.use("/api/ml", mlRouter);
  app.use("/api/paper", paperRouter);
  app.use("/api/alerts", alertsRouter);

  // Vite middleware in dev, static serving in prod
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Bitcoin Lab server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
