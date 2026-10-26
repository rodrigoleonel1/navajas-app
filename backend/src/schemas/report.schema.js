// El reporte de negocio usa el mismo rango de fechas que los ingresos:
// from/to en YYYY-MM-DD, con from <= to y un máximo de 366 días.
export { earningsQuerySchema as reportQuerySchema } from "./earnings.schema.js";
