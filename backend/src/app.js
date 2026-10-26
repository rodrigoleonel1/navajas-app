import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { connectMongo } from "./middlewares/connectMongo.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { sanitizeInputs } from "./middlewares/sanitize.js";
import appointmentRoutes from "./routes/appointments.js";
import authRoutes from "./routes/auth.js";
import barberRoutes from "./routes/barbers.js";
import cronRoutes from "./routes/cron.js";
import holidayRoutes from "./routes/holidays.js";
import notificationRoutes from "./routes/notifications.js";
import offerRoutes from "./routes/offers.js";
import ratingRoutes from "./routes/ratings.js";
import reportRoutes from "./routes/reports.js";
import serviceRoutes from "./routes/services.js";
import voucherConfigRoutes from "./routes/voucherConfig.js";
import voucherRoutes from "./routes/vouchers.js";

const app = express();

// X-Total-Count viaja en la respuesta del listado paginado de turnos.
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ["X-Total-Count"],
  }),
);
app.use(express.json());

app.use(sanitizeInputs);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: config.NODE_ENV });
});

app.use(connectMongo);

app.use("/api/auth", authRoutes);
app.use("/api/barbers", barberRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/voucher-config", voucherConfigRoutes);
app.use("/api/cron", cronRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
