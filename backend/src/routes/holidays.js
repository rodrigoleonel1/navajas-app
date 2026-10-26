import { Router } from "express";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
} from "../controllers/holiday.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import {
  createHolidaySchema,
  listHolidaysQuerySchema,
  updateHolidaySchema,
} from "../schemas/holiday.schema.js";

const router = Router();

// Los feriados son configuración global del negocio: solo admin.
router.use(authenticate, requireRole("admin"));

router.get("/", validateQuery(listHolidaysQuerySchema), listHolidays);
router.post("/", validateBody(createHolidaySchema), createHoliday);
router.patch("/:id", validateBody(updateHolidaySchema), updateHoliday);
router.delete("/:id", deleteHoliday);

export default router;
