import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!config.MONGO_URI) throw new Error("MONGO_URI no configurado");
  await mongoose.connect(config.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("[mongo] conectado");
}
