import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { analyticsRouter } from "./analytics.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/analytics", analyticsRouter);
