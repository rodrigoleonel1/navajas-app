import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
};
