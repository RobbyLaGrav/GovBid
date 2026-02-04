import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { createRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { RATE_LIMITS } from "../utils/constants.js";

export const authRouter = Router();

authRouter.post("/register", createRateLimiter(RATE_LIMITS.auth), register);
authRouter.post("/login", createRateLimiter(RATE_LIMITS.auth), login);
