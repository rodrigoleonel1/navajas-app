import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { connectMongo } from "./middlewares/connectMongo.js";
import { sanitizeInputs } from "./middlewares/sanitize.js";
import authRoutes from "./routes/auth.js";
import barberRoutes from "./routes/barbers.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(sanitizeInputs);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: config.NODE_ENV });
});

app.use(connectMongo);

app.use("/api/auth", authRoutes);
app.use("/api/barbers", barberRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
