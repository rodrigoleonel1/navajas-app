import {
  getAdminEarnings as getAdminEarningsService,
  getBarberEarnings as getBarberEarningsService,
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

export async function getAdminEarnings(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const earnings = await getAdminEarningsService({
      from: query.from,
      to: query.to,
    });
    res.json(earnings);
  } catch (err) {
    next(err);
  }
}
