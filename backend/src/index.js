import dotenv from "dotenv";
import app from "./app.js";
import { config } from "./config.js";
import { connectDB } from "./db.js";

dotenv.config();

async function start() {
  try {
    await connectDB();

    if (process.env.VERCEL) {
      console.log("[server] modo serverless, sin listen");
      return;
    }

    app.listen(config.PORT, () => {
      console.log(`[server] escuchando en http://localhost:${config.PORT}`);
      console.log(`[health] GET http://localhost:${config.PORT}/api/health`);
    });
  } catch (err) {
    console.error("[mongo] error de conexión", err);
    process.exit(1);
  }
}

start();

export { app, start, connectDB };
export default app;
