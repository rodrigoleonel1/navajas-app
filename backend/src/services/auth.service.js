import { createHash, isValidPassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
import { createAppError } from "../utils/appError.js";
import { User } from "../models/User.js";

// signup: crea cliente, valida duplicado
export async function signup({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.findOne({ email: normalizedEmail }).lean();
  if (exists) {
    throw createAppError(409, "CONFLICT", "Email ya registrado");
  }

  const password_hash = await createHash(password);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password_hash,
    role: "client",
  });

  const token = generateToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

// login: verifica email + password, firma JWT 7d con {id,role,email}
export async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw createAppError(401, "UNAUTHORIZED", "Email o contraseña incorrectos");
  }

  const isValid = await isValidPassword(password, user.password_hash);
  if (!isValid) {
    throw createAppError(401, "UNAUTHORIZED", "Email o contraseña incorrectos");
  }

  const token = generateToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
