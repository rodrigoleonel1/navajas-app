import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["client", "barber", "admin"],
      required: true,
      default: "client",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    barberProfile: {
      workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "18:00" },
      },
      daysOff: { type: [Date], default: [] },
      holidays: { type: [Date], default: [] },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Índice único en email: evita duplicados y acelera login/signup por email
userSchema.index({ email: 1 }, { unique: true });
// Índice en role: filtra rápido por client|barber|admin
userSchema.index({ role: 1 });

export const User = mongoose.model("User", userSchema);
