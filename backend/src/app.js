import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { config } from "./config.js";
import { connectDB } from "./db.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://navajas.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
// express-mongo-sanitize incompatible con Express 5 (req.query getter) -> sanitizar solo body/params
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// Lazy DB connect para Vercel serverless sin bloquear /health
app.use(async (req, _res, next) => {
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: config.nodeEnv });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: config.nodeEnv });
});

// Swagger stub - se completa en Fase 1 con swagger-jsdoc
// import swaggerJsdoc from "swagger-jsdoc";
// import swaggerUi from "swagger-ui-express";

app.use(notFound);
app.use(errorHandler);

export default app;
