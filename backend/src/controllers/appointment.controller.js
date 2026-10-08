import {
  createAppointment as createAppointmentService,
  listAppointments as listAppointmentsService,
  getAvailability as getAvailabilityService,
} from "../services/appointment.service.js";

export async function createAppointment(req, res, next) {
  try {
    const appointment = await createAppointmentService({
      clientId: req.user.id,
      barberId: req.body.barberId,
      serviceIds: req.body.serviceIds,
      startAt: req.body.startAt,
    });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function listAppointments(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const appointments = await listAppointmentsService({
      requester: { id: req.user.id, role: req.user.role },
      barberId: query.barberId,
      date: query.date,
      status: query.status,
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}

export async function getAvailability(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const availability = await getAvailabilityService({
      barberId: query.barberId,
      date: query.date,
      serviceIds: query.serviceIds,
      durationMinutes: query.durationMinutes,
      step: query.step,
      horizonDays: query.horizonDays,
    });
    res.json(availability);
  } catch (err) {
    next(err);
  }
}
