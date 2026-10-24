import nodemailer from "nodemailer";
import { config } from "../../config.js";
import { EMAIL_PROVIDERS } from "./email.config.js";
import { createEmailError, EMAIL_ERROR_CODES } from "./email.errors.js";

// El transporte SMTP se reutiliza entre envíos del mismo proceso. En Vercel
// cada invocación puede crear uno nuevo; por eso los timeouts son acotados.
let smtpTransport;

function getSmtpTransport() {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
      connectionTimeout: config.EMAIL_TIMEOUT_MS,
      greetingTimeout: config.EMAIL_TIMEOUT_MS,
      socketTimeout: config.EMAIL_TIMEOUT_MS,
    });
  }
  return smtpTransport;
}

// No envía: imprime el email en logs para desarrollo/CI.
const consoleProvider = {
  name: "console",
  async send({ to, subject, html, text }) {
    console.log(`[email:console] to=${to} subject="${subject}"`);
    if (text) console.log(`[email:console] text:\n${text}`);
    if (html) console.log(`[email:console] html (${html.length} chars)`);
  },
};

const smtpProvider = {
  name: "smtp",
  async send({ to, subject, html, text }) {
    await getSmtpTransport().sendMail({
      from: config.MAIL_FROM,
      to,
      subject,
      text,
      html,
    });
  },
  async verify() {
    await getSmtpTransport().verify();
  },
};

const providers = {
  console: consoleProvider,
  smtp: smtpProvider,
};

export function getEmailProvider(providerName = config.EMAIL_PROVIDER) {
  const provider = providers[providerName];
  if (!provider) {
    throw createEmailError(
      EMAIL_ERROR_CODES.CONFIG,
      `Proveedor de email no soportado: "${providerName}" (usar ${EMAIL_PROVIDERS.join(", ")})`,
    );
  }
  return provider;
}

// Cierra el transporte SMTP. Útil en tests o scripts que terminan el proceso.
export function resetEmailProvider() {
  if (smtpTransport) {
    smtpTransport.close();
    smtpTransport = undefined;
  }
}
