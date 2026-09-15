import {
  login as loginService,
  signup as signupService,
} from "../services/auth.service.js";

// POST /api/auth/signup
export async function signup(req, res, next) {
  try {
    const result = await signupService(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const result = await loginService(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
