import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { requestLogger } from "./middleware/logger.middleware.js";
import { apiRouter } from "./routes/index.js";
import { logger } from "./utils/logger.js";

dotenv.config();

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "GovBid API",
    status: "ready"
  });
});

app.use("/api", apiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { message: err.message });
  res.status(500).json({ error: "Internal server error" });
});
