import { Router } from "express";
import { validateBody } from "../middlewares/validateBody.js";
import { loginSchema, signupSchema } from "../schemas/auth.schema.js";
import { login, signup } from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);

export default router;
