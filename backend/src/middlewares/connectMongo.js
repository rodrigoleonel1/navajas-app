import { connectDB } from "../db.js";

// connectMongo: conexión lazy a Mongo para Vercel serverless.
export async function connectMongo(_req, _res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
}
