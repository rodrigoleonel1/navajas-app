// Formato de moneda argentino: "$15.000".
export function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR")}`;
}
