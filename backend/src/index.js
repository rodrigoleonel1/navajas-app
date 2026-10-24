import app from "./app.js";
import { config } from "./config.js";
import { connectDB } from "./db.js";
import { getEmailConfigErrors } from "./services/email/email.config.js";

async function start() {
  try {
    // Aviso temprano de configuración de email
    const emailErrors = getEmailConfigErrors();
    if (emailErrors.length > 0) {
      console.warn(
        `[email] configuración inválida o incompleta (${config.EMAIL_PROVIDER}): ${emailErrors.join(", ")}`,
      );
    } else {
      console.log(`[email] proveedor configurado: ${config.EMAIL_PROVIDER}`);
    }

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
