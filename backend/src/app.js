import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { connectMongo } from "./middlewares/connectMongo.js";

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
  res.json({ status: "ok", env: config.nodeEnv });
});

app.use(notFound);
app.use(errorHandler);

export default app;
