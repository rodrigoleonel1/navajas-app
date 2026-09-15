import mongoose from "mongoose";
import { config } from "./config.js";

let isConnected = false;

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  if (!config.MONGO_URI.includes("localhost") || process.env.MONGO_URI) {
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      return;
    }
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[mongo] conectado a ${config.MONGO_URI.split("@").pop()}`);
  } else {
    console.log(
      "[mongo] MONGO_URI no configurado, omitiendo conexión (dev sin DB)",
    );
  }
}
