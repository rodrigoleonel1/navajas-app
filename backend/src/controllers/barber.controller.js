import {
  createBarber as createBarberService,
  listBarbers as listBarbersService,
} from "../services/barber.service.js";

export async function createBarber(req, res, next) {
  try {
    const barber = await createBarberService(req.body);
    res.status(201).json({ user: barber });
  } catch (err) {
    next(err);
  }
}

export async function listBarbers(req, res, next) {
  try {
    const barbers = await listBarbersService();
    res.json(barbers);
  } catch (err) {
    next(err);
  }
}
