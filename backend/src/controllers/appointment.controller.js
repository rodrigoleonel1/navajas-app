import {
  createAppointment as createAppointmentService,
  listAppointments as listAppointmentsService,
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
    const appointments = await listAppointmentsService({
      requester: { id: req.user.id, role: req.user.role },
      barberId: req.query.barberId,
      date: req.query.date,
      status: req.query.status,
    });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
}
