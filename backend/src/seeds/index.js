import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { createHash } from "../utils/bcrypt.js";
import { User } from "../models/User.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

export async function seed() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL y ADMIN_PASSWORD deben estar definidos en .env");
  }

  try {
    await connectDB();
    console.log("[seed] conectado");

    const exists = await User.findOne({ email: ADMIN_EMAIL }).lean();
    if (exists) {
      console.log(`[seed] admin ya existe: ${ADMIN_EMAIL}`);
      return;
    }

    const password_hash = await createHash(ADMIN_PASSWORD);
    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password_hash,
      role: "admin",
    });
    console.log(`[seed] admin creado: ${admin.email} (${admin._id})`);
  } catch (err) {
    console.error("[seed] error", err);
    process.exitCode = 1;
    throw err;
  } finally {
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("seeds/index.js")) {
  seed().catch(() => process.exit(1));
}
