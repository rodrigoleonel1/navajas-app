import {
  createAppointment as createAppointmentService,
  getAvailability as getAvailabilityService,
  listAppointments as listAppointmentsService,
  updateAppointmentStatus as updateAppointmentStatusService,
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
    const { appointments, total } = await listAppointmentsService({
      requester: { id: req.user.id, role: req.user.role },
      barberId: query.barberId,
      date: query.date,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
      order: query.order,
      page: query.page,
    });
    // Total del filtro, solo cuando hay paginación (el body sigue siendo el array).
    if (total !== null) res.set("X-Total-Count", String(total));
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

export async function updateAppointmentStatus(req, res, next) {
  try {
    const appointment = await updateAppointmentStatusService({
      id: req.params.id,
      status: req.body.status,
    });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}
