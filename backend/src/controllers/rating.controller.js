import { createRating as createRatingService } from "../services/rating.service.js";

export async function createRating(req, res, next) {
  try {
    const rating = await createRatingService({
      appointmentId: req.body.appointmentId,
      score: req.body.score,
      clientId: req.user.id,
    });
    res.status(201).json(rating);
  } catch (err) {
    next(err);
  }
}
