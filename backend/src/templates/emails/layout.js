import { config } from "../../config.js";

// Mismos colores que el tema principal de la app.
export const PRIMARY_COLOR = "#60a5fa";
export const PRIMARY_FOREGROUND = "#11100f";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Mismo formato que el frontend: "$15.000".
export function formatPrice(price) {
  const value = Number(price) || 0;
  return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

// Fila de la tabla de detalle del turno.
export function detailRow(label, value, strong = false) {
  return `<tr>
    <td style="padding:6px 0;color:#6b6b6b;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;text-align:right;font-size:14px;${strong ? "font-weight:bold;" : ""}">${escapeHtml(value)}</td>
  </tr>`;
}

// Link absoluto al frontend a partir de una ruta interna ("/app/...").
export function appLink(path) {
  return `${config.APP_URL.replace(/\/+$/, "")}${path}`;
}

// Una nota es texto plano (se escapa) u `{ html }` cuando el template ya
// construyó el markup, por ejemplo para incluir un link.
function renderNote(note, margin) {
  const body = typeof note === "string" ? escapeHtml(note) : note.html;
  return `<p style="margin:${margin}px 0 0;font-size:12px;color:#777777;">${body}</p>`;
}

// Shell común de los 6 emails: header, saludo, intro, tabla de detalle, notas
// antes del botón, CTA, nota final y footer. Los templates solo aportan
// contenido; el escapado de `intro`, `notes`, `clientName` y `cta` se hace acá.
export function renderEmail({
  clientName = "cliente",
  intro = "",
  rows = "",
  notes = [],
  cta,
  footerNote,
  // Inasistencia usaba 20px; el resto 16px. Se mantiene para no alterar emails.
  noteMargin = 16,
}) {
  const notesHtml = notes.map((note) => renderNote(note, noteMargin)).join("");
  const footerHtml = footerNote
    ? `<p style="margin:20px 0 0;font-size:12px;color:#777777;">
                  ${escapeHtml(footerNote)}
                </p>`
    : "";

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${PRIMARY_COLOR};padding:20px 24px;color:${PRIMARY_FOREGROUND};font-size:18px;letter-spacing:2px;font-weight:bold;">
                NAVAJAS BARBER
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(clientName)},</p>
                <p style="margin:0 0 20px;font-size:14px;color:#555555;">
                  ${escapeHtml(intro)}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
                ${notesHtml}
                <p style="margin:24px 0 0;text-align:center;">
                  <a href="${escapeHtml(cta.href)}" style="display:inline-block;background:${PRIMARY_COLOR};color:${PRIMARY_FOREGROUND};text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;">
                    ${escapeHtml(cta.label)}
                  </a>
                </p>
                ${footerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#faf8f4;font-size:11px;color:#999999;">
                Navajas — Barbería
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
