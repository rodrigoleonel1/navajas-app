import { connectDB } from "../db.js";

// connectMongo: conexión lazy a Mongo para Vercel serverless.
// En Vercel no hay servidor permanente, cada request crea una función nueva
// y no hay app.listen. Por eso se conecta solo cuando llega un pedido que
// realmente necesita la DB.
export async function connectMongo(req, _res, next) {
  if (req.path === "/api/health") {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
}
