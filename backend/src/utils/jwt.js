import jwt from "jsonwebtoken";
import { config } from "../config.js";

const JWT_EXPIRES_IN = "7d";

export function generateToken({ id, role, email }) {
  return jwt.sign({ id, role, email }, config.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}
