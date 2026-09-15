import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function createHash(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function isValidPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
