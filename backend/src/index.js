import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";
import { config } from "./config.js";

dotenv.config();

let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  if (!config.mongoUri.includes("localhost") || process.env.MONGO_URI) {
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return;
    }
    await mongoose.connect(config.mongoUri);
    isConnected = true;
    console.log(`[mongo] conectado a ${config.mongoUri.split("@").pop()}`);
  } else {
    console.log("[mongo] MONGO_URI no configurado, omitiendo conexión (dev sin DB)");
  }
}

async function start() {
  try {
    await connectDB();

    if (process.env.VERCEL) {
      console.log("[server] modo serverless, sin listen");
      return;
    }

    app.listen(config.port, () => {
      console.log(`[server] escuchando en http://localhost:${config.port}`);
      console.log(`[health] GET http://localhost:${config.port}/health`);
    });
  } catch (err) {
    console.error("[mongo] error de conexión", err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { app, start, connectDB };
export default app;
