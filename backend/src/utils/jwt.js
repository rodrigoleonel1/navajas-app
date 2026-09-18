import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function generateToken({ id, role, email }) {
  return jwt.sign({ id, role, email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES,
  });
}
