import { sendAppointmentReminders } from "../services/reminder.service.js";

// GET /api/cron/reminders — disparado por Vercel Cron una vez por día.
export async function runReminders(req, res, next) {
  try {
    const summary = await sendAppointmentReminders({ now: new Date() });
    res.json({ ok: true, ...summary });
  } catch (err) {
    next(err);
  }
}
