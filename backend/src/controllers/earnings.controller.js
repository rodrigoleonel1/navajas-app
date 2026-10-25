import {
  getBarberEarnings as getBarberEarningsService,
  getDailyEarnings as getDailyEarningsService,
} from "../services/earnings.service.js";

export async function getMyEarnings(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const earnings = await getBarberEarningsService({
      barberId: req.user.id,
      from: query.from,
      to: query.to,
    });
    res.json(earnings);
  } catch (err) {
    next(err);
  }
}

export async function getDailyEarnings(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const earnings = await getDailyEarningsService({ date: query.date });
    res.json(earnings);
  } catch (err) {
    next(err);
  }
}
