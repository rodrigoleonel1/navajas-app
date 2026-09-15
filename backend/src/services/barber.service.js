import { createHash } from "../utils/bcrypt.js";
import { createAppError } from "../utils/appError.js";
import { User } from "../models/User.js";

export async function createBarber({ name, email, password }) {
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
    role: "barber",
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function listBarbers() {
  const barbers = await User.find({ role: "barber" })
    .select("name email role barberProfile")
    .lean();
  return barbers.map((barber) => ({
    id: barber._id.toString(),
    name: barber.name,
    email: barber.email,
    role: barber.role,
    barberProfile: barber.barberProfile,
  }));
}
