import { Router } from "express";
import { analyticsOverview, analyticsTrends } from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/permission.middleware.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", requireAuth, analyticsOverview);
analyticsRouter.get("/trends", requireAuth, analyticsTrends);
