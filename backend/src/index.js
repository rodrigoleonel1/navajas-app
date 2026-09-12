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
