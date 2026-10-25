import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Carga .env desde cwd (pnpm seed) y fallback a backend/.env (node seeds/index.js desde src/)
dotenv.config();
dotenv.config({ path: path.join(__dirname, "../.env") });

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/navajas",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES: process.env.JWT_EXPIRES || "7d",
  NODE_ENV: process.env.NODE_ENV || "development",

  // Base pública del frontend: se usa en los links de los emails.
  APP_URL: process.env.APP_URL || "http://localhost:5173",

  // Secreto que Vercel Cron envía como Authorization: Bearer <CRON_SECRET>.
  CRON_SECRET: process.env.CRON_SECRET || "",

  // Email transaccional. Por defecto no envía nada real.
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || "console").toLowerCase().trim(),
  EMAIL_TIMEOUT_MS: parseInt(process.env.EMAIL_TIMEOUT_MS || "5000", 10),
  MAIL_FROM: process.env.MAIL_FROM || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
};
