import serverless from "serverless-http";
import app from "../backend/src/app.js";
import { connectDB } from "../backend/src/index.js";

// Asegurar conexión a Mongo antes de cada invocación serverless
let dbReady = false;
async function ensureDB() {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }
}

const handler = serverless(app);

export default async (req, res) => {
  await ensureDB();
  return handler(req, res);
};
