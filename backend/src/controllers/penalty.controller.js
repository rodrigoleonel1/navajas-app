import { getClientPenaltyStatus as getClientPenaltyStatusService } from "../services/penalty.service.js";

export async function getClientPenaltyStatus(req, res, next) {
  try {
    const status = await getClientPenaltyStatusService({ userId: req.user.id });
    res.json(status);
  } catch (err) {
    next(err);
  }
}
