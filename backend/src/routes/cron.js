import { Router } from "express";
import { runReminders } from "../controllers/cron.controller.js";
import { requireCronSecret } from "../middlewares/requireCronSecret.js";

const router = Router();

router.get("/reminders", requireCronSecret, runReminders);

export default router;
