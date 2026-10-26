import {
  createHoliday as createHolidayService,
  deleteHoliday as deleteHolidayService,
  listHolidays as listHolidaysService,
  updateHoliday as updateHolidayService,
} from "../services/holiday.service.js";

export async function listHolidays(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const { holidays, total } = await listHolidaysService({
      scope: query.scope,
      limit: query.limit,
      page: query.page,
    });
    // Total del filtro, solo cuando hay paginación (el body sigue siendo el array).
    if (total !== null) res.set("X-Total-Count", String(total));
    res.json(holidays);
  } catch (err) {
    next(err);
  }
}

export async function createHoliday(req, res, next) {
  try {
    const result = await createHolidayService(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateHoliday(req, res, next) {
  try {
    const holiday = await updateHolidayService(req.params.id, req.body);
    res.json(holiday);
  } catch (err) {
    next(err);
  }
}

export async function deleteHoliday(req, res, next) {
  try {
    const holiday = await deleteHolidayService(req.params.id);
    res.json(holiday);
  } catch (err) {
    next(err);
  }
}
