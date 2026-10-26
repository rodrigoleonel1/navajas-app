import { Router } from "express";
import {
  createOffer,
  listOffers,
  updateOffer,
} from "../controllers/offer.controller.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import {
  createOfferSchema,
  updateOfferSchema,
} from "../schemas/offer.schema.js";

const router = Router();

router.get("/", optionalAuthenticate, listOffers);

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validateBody(createOfferSchema),
  createOffer,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateOfferSchema),
  updateOffer,
);

export default router;
