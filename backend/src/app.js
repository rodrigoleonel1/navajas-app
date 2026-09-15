import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { connectMongo } from "./middlewares/connectMongo.js";
import authRoutes from "./routes/auth.js";
import barberRoutes from "./routes/barbers.js";

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Sanitiza body y params contra inyeccion NoSQL
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// Conexión lazy a Mongo para Vercel serverless
app.use(connectMongo);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: config.NODE_ENV });
});

app.use("/api/auth", authRoutes);
app.use("/api/barbers", barberRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
