import {
  createBarber as createBarberService,
  getBarberById as getBarberByIdService,
  listBarbers as listBarbersService,
  updateBarberProfile as updateBarberProfileService,
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

export async function getBarberById(req, res, next) {
  try {
    const barber = await getBarberByIdService(req.params.id);
    res.json(barber);
  } catch (err) {
    next(err);
  }
}

export async function updateBarberProfile(req, res, next) {
  try {
    const barber = await updateBarberProfileService(req.params.id, req.body);
    res.json(barber);
  } catch (err) {
    next(err);
  }
}
