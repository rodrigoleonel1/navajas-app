# Navajas Barber — Arquitectura y estándares técnicos

## Stack y herramientas

### Frontend

```text
React 19
TypeScript 6
Vite 8
Tailwind CSS 4
@tailwindcss/vite
tailwind-merge
clsx
React Router DOM 7
Axios
Zod
date-fns
Recharts
React Hook Form
@hookform/resolvers
Lucide React
```

### Backend

```text
Node.js
Express 5
TypeScript
Mongoose 9
MongoDB Atlas
Zod
jsonwebtoken
bcryptjs
cors
dotenv
nodemailer (alternativa: Resend según FRD)
date-fns
express-mongo-sanitize
express-rate-limit
swagger-jsdoc
swagger-ui-express
ts-node-dev (dev)
```

---

## 1. Arquitectura Backend (Node.js + Express + Mongoose)

### Librerías y responsabilidades

- **Express:** servidor HTTP y API REST.
- **Mongoose:** ODM y acceso a MongoDB Atlas.
- **Zod:** validación de body/query y contratos de entrada.
- **jsonwebtoken:** autenticación basada en JWT.
- **bcryptjs:** hashing de contraseñas.
- **cors:** configuración de acceso entre frontend y backend.
- **dotenv:** variables de entorno.
- **Nodemailer / Resend:** envío de emails y notificaciones por correo (ver FRD 4.1/4.2: Nodemailer en V1, Resend como alternativa).
- **`date-fns`:** cálculos y manipulación de fechas.
- **express-mongo-sanitize:** sanitización de entradas para reducir riesgos de inyección en consultas MongoDB.
- **express-rate-limit:** limitación de solicitudes en endpoints sensibles.
- **ts-node-dev:** desarrollo del backend TypeScript con reinicio automático.
- **swagger-jsdoc + swagger-ui-express:** documentación OpenAPI.

### Estructura

Mantener una estructura estricta y separada por responsabilidades:

```text
backend/
├── routes/       # REST + anotaciones OpenAPI inline
├── controllers/  # req → service → res
├── services/     # única capa de lógica de negocio
├── models/       # Mongoose
├── middlewares/  # auth, errorHandler
├── schemas/      # Validaciones Zod
├── utils/        # helpers puros sin acceso a DB (formateo, cálculos)
├── migrations/   # migrate-mongo versionadas, idempotentes
└── seeds/        # datos determinísticos
```

### Responsabilidades

- **`routes/`**: definición de rutas REST, middleware y validaciones de entrada. Anotaciones OpenAPI inline.
- **`controllers/`**: orquestación de `req → service → res`. No deben contener lógica de negocio.
- **`services/`**: única capa donde debe residir la lógica de negocio.
- **`models/`**: modelos y schemas de Mongoose.
- **`middlewares/`**: autenticación, autorización, manejo de errores y otros middlewares transversales.
- **`schemas/`**: schemas de validación con Zod.
- **`utils/`**: helpers puros reutilizables sin acceso a DB (ej: formateo, cálculos). Evitar lógica de negocio o acceso a modelos aquí.
- **`migrations/`**: scripts versionados con `migrate-mongo`.
- **`seeds/`**: datos iniciales determinísticos y reproducibles.

### Lógica de negocio

Toda regla de negocio debe implementarse exclusivamente en `services/`.

Reglas **RN0–RN11** definidas en `docs/FRD-Navajas.md:93-107`:

- **RN0:** confirmación (email + in-app) al reservar turno.
- **RN1 + RN10:** cálculo de disponibilidad (solapamiento + jornada laboral/feriados/días libres).
- **RN2:** cálculo de duración total del turno según servicios.
- **RN3:** cálculo de la ventana de cancelación (≥24h / 4–24h / <4h).
- **RN4:** inasistencia manual por admin con tolerancia 15 min (no libera horario).
- **RN5:** conteo de inasistencias (3 en 2 meses) y aplicación del recargo del 20% con reinicio de contador.
- **RN6:** cálculo de comisión 60/40 sobre precio histórico.
- **RN7:** cancelación por admin → vale 20% con caducidad configurada.
- **RN8:** cada 10 turnos completados (10°,20°...) → vale fidelidad 30%.
- **RN9:** recordatorio 24h antes (Vercel Cron).
- **RN11:** gestión de ofertas/combos con % descuento.

Los controllers únicamente deben recibir la petición, delegar al service y construir la respuesta HTTP.

### API REST

Todas las rutas bajo prefijo `/api`. Usar nombres de recursos en plural:

```text
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/services
GET    /api/barbers
POST   /api/appointments
GET    /api/appointments?barberId=...&date=...
PATCH  /api/appointments/:id/cancel
PATCH  /api/appointments/:id/complete
PATCH  /api/appointments/:id/no-show
GET    /api/vouchers
GET    /api/offers
POST   /api/ratings
GET    /api/notifications
```

Ejemplos:

```http
POST /api/appointments
GET /api/appointments?barberId=...&date=2026-09-11
PATCH /api/appointments/:id/cancel
```

> Antes documentado como `/appointments/:id/cancel` sin prefijo → normalizado a `PATCH /api/appointments/:id/cancel` (RPC controlado; alternativa REST pura `PATCH /api/appointments/:id {status:'cancelled'}`).

### Manejo de errores

Centralizar el manejo de errores mediante `errorHandler`.

El formato de error es obligatorio y uniforme:

```json
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

---

## 2. Base de Datos Mongoose (MongoDB Atlas)

### Colecciones y modelos

Las colecciones deben utilizar nombres **snake_case y plural**:

```text
appointments
services
vouchers
users
notifications
```

Los modelos deben utilizar nombres **PascalCase y singular**:

```text
Appointment
Service
Voucher
User
Notification
```

**Modelo de barberos (decisión):** colección única `users` con campo `role: 'client' | 'barber' | 'admin'`.

```js
// users
{
  email: String, // unique
  password_hash: String,
  role: 'client' | 'barber' | 'admin',
  name: String,
  barberProfile: { // solo si role === 'barber'
    workingHours: { start: String, end: String },
    daysOff: [Date],
    holidays: [Date]
  }
}
```

`appointments.barber_id` y `appointments.client_id` referencian `users._id` con validación `role === 'barber'|'client'`.

### Timestamps

Todos los schemas deben utilizar timestamps.

Convención:

```js
timestamps: {
  createdAt: 'created_at',
  updatedAt: 'updated_at'
}
```

Esto garantiza que los documentos almacenen:

```text
created_at
updated_at
```

### Optimización de consultas

Evitar traer documentos completos cuando no sea necesario.

Priorizar:

- `.select()`
- `.lean()`
- projection explícita
- `populate()` únicamente para las referencias necesarias

Ejemplo conceptual:

```js
Appointment.find(query)
  .select('barber_id client_id start_at end_at status price_snapshot')
  .lean();
```

### Índices

Los índices son especialmente importantes para la consulta de disponibilidad definida por **RN1**.

#### `appointments`

Índice compuesto para solapamiento (RN1):

```js
// disponibilidad RN1: barbero + ventana temporal + estado
appointmentSchema.index({ barber_id: 1, start_at: 1, end_at: 1, status: 1 });
// historial cliente
appointmentSchema.index({ client_id: 1, start_at: 1 });
// rango temporal general
appointmentSchema.index({ start_at: 1 });
```

> Antes: 4 índices separados `barber_id+start_at`, `client_id`, `status`, `start_at` → optimizado a compuestos para queries de rango `$lt/$gt` en solapamiento.

#### `vouchers`

Índice compuesto (sin `status` porque se calcula al vuelo según `FRD CA-12` vigente/usado/vencido):

```js
voucherSchema.index({ client_id: 1, expires_at: 1 });
```

#### `users`

```js
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
```

### Transacciones al crear un turno

La creación de un turno debe ejecutarse dentro de una transacción de MongoDB usando:

```js
mongoose.startSession()
```

y:

```js
session.withTransaction()
```

Flujo atómico corregido (antes 11 pasos redundantes con solapamiento duplicado y snapshot antes de descuentos):

```js
await session.withTransaction(async () => {
  // 1. Calcular disponibilidad RN1+RN10 y duración RN2 (incluye validación de solapamiento)
  // 2. Obtener precio base de servicios
  // 3. Aplicar RN11 (oferta) → RN5 (recargo 20% si corresponde) → vale (20%/30% si corresponde) en BE
  //    Usar Math.round para evitar errores float en %
  // 4. Guardar price_snapshot y duration_snapshot FINALES (histórico real cobrado)
  // 5. Crear Appointment
});
// 6. Encolar Notification (outbox) fuera de la transacción → email (Nodemailer/Resend) + in-app eventual
```

- Si cualquier paso 1-5 falla → rollback.
- Email no es transaccional: no crear `Notification` con envío síncrono dentro de `withTransaction`; usar patrón outbox/eventual.
- Si aplica, creación de `Voucher` (RN7/RN8) también dentro de transacción.

### Migraciones y seeds

MongoDB no requiere un sistema de migraciones basado en SQL. Para cambios estructurales o de datos utilizar:

- `migrate-mongo`, o
- scripts versionados en `backend/migrations/`.

Las migraciones deben ser idempotentes cuando sea posible y estar versionadas junto con el código.

Los datos iniciales deben estar en `seeds/` y ser determinísticos.

Ejemplo:

```text
backend/
├── migrations/
└── seeds/
```

Los seeds deben poder ejecutarse de forma reproducible mediante:

```bash
pnpm seed
# ejecuta ts-node seeds/index.ts
```

`package.json` debe definir:

```json
{ "scripts": { "seed": "ts-node seeds/index.ts" } }
```

Utilizar datos fijos, por ejemplo:

- 3 barberos.
- 4 servicios fijos.
- Usuario administrador definido según `FRD-Navajas.md:220`.

La finalidad es permitir reproducibilidad de tests, especialmente para **RN5** y **RN8**.

### Precios históricos

Nunca modificar el precio histórico almacenado en un turno.

`Appointment` debe guardar snapshots finales (tras aplicar oferta/recargo/vale):

```text
price_snapshot
duration_snapshot
```

Esto permite que un cambio posterior en el servicio no altere la información histórica de turnos ya creados.

---

## 3. Seguridad, Auth y Validación (Zod + bcrypt + JWT)

### Passwords

Usar `bcryptjs` con:

```text
saltRounds = 10
```

Nunca almacenar contraseñas en texto plano.

### JWT

El JWT debe contener el rol del usuario:

```text
client
barber
admin
```

Implementar middleware de autorización reutilizable:

```js
requireRole('client')
requireRole('barber')
requireRole('admin')
```

Los roles deben utilizarse para proteger operaciones sensibles, especialmente las relacionadas con **FRD EP-6 / HU-17 / HU-18**.

### Matriz de autorización

| Ruta | client | barber | admin | Filtrado / Nota |
| :--- | :---: | :---: | :---: | :--- |
| `POST /api/appointments` | ✓ |  |  | `client_id = req.user.id` |
| `GET /api/appointments` | ✓ (propios) | ✓ (propios) | ✓ (todos) | `if role !== 'admin' filter by req.user.id` — CA-15 |
| `PATCH /api/appointments/:id/cancel` | ✓ (propio) |  | ✓ (emite vale RN7) | verificar ownership |
| `PATCH /api/appointments/:id/complete` |  |  | ✓ | RN6, RN8 |
| `PATCH /api/appointments/:id/no-show` |  |  | ✓ | RN4, RN5 |
| `POST /api/barbers` |  |  | ✓ | CA-3, alta barbero |
| `GET /api/barbers/me/earnings` |  | ✓ |  | `barber_id = req.user.id` |
| `POST /api/offers` |  |  | ✓ | RN11 |
| `GET /api/vouchers` | ✓ (propios) |  |  | `client_id = req.user.id` |

### Filtrado obligatorio por identidad

La identidad del usuario debe derivarse siempre del JWT.

#### Cliente

Para:

```http
GET /api/appointments
```

el `client_id` debe obtenerse de:

```js
req.user.id
```

Nunca confiar directamente en:

```text
body.clientId
query.customer_id
```

sin validar que coincidan con la identidad autenticada.

#### Barbero

Las consultas de agenda deben filtrar por:

```text
barber_id = req.user.id
```

Esto es obligatorio para cumplir **CA-15**. El admin es la excepción que puede consultar sin filtro o con `?barberId=`.

### Validación Zod

Todos los endpoints que reciban `body` o `query` deben utilizar schemas Zod.

Como mínimo:

```text
POST /api/appointments
POST /api/auth/signup
POST /api/auth/login
POST /api/ratings
```

Los schemas deben cubrir las reglas de entrada relevantes, incluyendo **CA-1** para signup.

Cuando sea posible, compartir la definición de schemas entre:

```text
frontend/src/lib/
backend/schemas/
```

evitando duplicar contratos de datos. Si se comparte, considerar monorepo `packages/shared` para no duplicar tipos.

---

## 4. Frontend (React 19 + TypeScript + Vite + Tailwind 4)

**Referencias:** `frontend/vite.config.ts:1-9`

### Librerías y responsabilidades

- **React Router DOM 7:** routing y navegación de la aplicación.
- **Axios:** cliente HTTP para comunicación FE/BE (prefijo `/api`).
- **Zod:** validación de datos y contratos de entrada.
- **React Hook Form + `@hookform/resolvers`:** gestión y validación de formularios.
- **`date-fns`:** manipulación y formateo de fechas.
- **Recharts:** gráficos y visualizaciones del panel administrativo.
- **Lucide React 0.511.0:** iconografía exclusiva (ver directiva abajo).
- **Tailwind CSS 4 + `@tailwindcss/vite` + `tailwind-merge`:** estilos y responsive design.
- **`clsx`:** composición condicional de clases.

### Iconografía

Directiva obligatoria — todos los iconos deben usar `lucide-react@0.511.0` (`frontend/package.json:18`):

- Prohibido unicode/emoji para flechas (`←`, `→`, `↓`) — usar `ArrowLeft`, `ArrowRight`, `ArrowUpRight`, `ArrowDown`, `Menu`, `X`, etc.
- Tamaños: `14` en botones/links, `16` en menú mobile.
- Siempre `aria-hidden="true"` y clases de transición: `opacity-60` base, `group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200` para iconos con hover (ver `Navbar.tsx:98`, `ServiceRow.tsx:36`).
- Ejemplo: `import { ArrowLeft } from "lucide-react"; <ArrowLeft size={14} aria-hidden="true" />`.

### Mobile-first

Tailwind debe utilizar una estrategia **mobile-first**:

- Los estilos base corresponden a mobile.
- Utilizar `lg:` para los ajustes específicos de desktop.

La implementación existente en:

```text
frontend/src/components/landing/
```

ya sigue este enfoque y debe mantenerse como referencia.

### Imágenes

Las imágenes de contenido deben utilizar lazy loading cuando corresponda:

```html
<img loading="lazy" ... />
```

Aplicar especialmente a:

```text
public/images/hero.jpg
public/images/work-*.jpg
```

### Code splitting

Separar los bundles por ruta utilizando `React.lazy()` y `Suspense`.

Ejemplo:

```tsx
const BookingPage = React.lazy(
  () => import('./pages/BookingPage')
);
```

Integrar con `react-router-dom@7`.

Actualmente:

```text
frontend/src/App.tsx:1
```

solo renderiza `LandingPage`; al incorporar el resto de la aplicación, separar las rutas y sus bundles.

El bundle de administración debe quedar separado del bundle del cliente:

```text
/app/admin/*
```

### Idempotencia de reservas

El botón **Confirmar turno / Reservar** debe deshabilitarse mientras la mutación esté pendiente:

```text
isPending
```

Esto evita dobles envíos y reduce el riesgo de reservas duplicadas que puedan romper la regla **RN1**.

### Rate limiting

Implementar `express-rate-limit` en endpoints sensibles:

```text
POST /api/auth/login
POST /api/auth/signup
POST /api/appointments
```

Objetivos:

- prevenir brute-force en autenticación;
- limitar spam de registros;
- limitar spam de reservas.

---

## 5. Formato de Datos y Documentación

### Fechas

La comunicación entre frontend y backend debe utilizar **ISO 8601 en UTC**.

Ejemplo:

```text
2026-09-11T19:42:00Z
```

Esto es crítico para los cálculos de ventanas temporales:

- **RN3:** cancelación con `>= 24h`, `4–24h` y `< 4h`.
- **RN9:** recordatorios mediante Vercel Cron.

Las fechas deben convertirse correctamente a UTC en los límites FE/BE para evitar errores por zona horaria.

### Montos

Los montos deben manejarse como `number`, nunca como `string`. Para evitar errores de punto flotante en descuentos/recargos con % (RN5 20%, RN11), redondear en BE con `Math.round`.

Correcto:

```json
{
  "price": 7500,
  "commission": 4500
}
```

Incorrecto:

```json
{
  "price": "7500",
  "commission": "4500"
}
```

Los recargos y descuentos deben calcularse exclusivamente en backend.

El frontend no debe considerarse una fuente confiable para el precio final.

> Alternativas a futuro si se requieren centavos: guardar en centavos `integer` (750000) o `Decimal128`.

### Swagger / OpenAPI

Documentar la API con:

```text
swagger-jsdoc
swagger-ui-express
```

Exponer la documentación en:

```text
/api-docs
```

Las anotaciones OpenAPI deben mantenerse inline en los archivos correspondientes de:

```text
routes/
```

---

## 6. Flujo Git y Conventional Commits

Mantener **Conventional Commits** y redactar los mensajes en español, adaptados al proyecto Navajas Barber.

### `feat`

Para nuevas funcionalidades:

```text
feat: implementar endpoint POST /api/appointments con validación de solapamiento RN1
```

### `fix`

Para correcciones de comportamiento:

```text
fix: corregir cálculo de ventana de cancelación RN3 y recargo RN5
```

### `style`

Para cambios exclusivamente visuales/de formato:

```text
style: ajustar breakpoint lg en agenda del barbero NAV007
```

### `refactor`

Para cambios internos sin modificar el comportamiento esperado:

```text
refactor: extraer cálculo de disponibilidad a appointmentAvailability.service
```

### `docs`

Para documentación:

```text
docs: actualizar BRD regla de vale fidelidad RN8
```

### `test`

Para tests:

```text
test: agregar test para emisión de vale cada 10 turnos RN8
```

### `chore`

Para tareas de mantenimiento:

```text
chore: instalar express-rate-limit y migrate-mongo
```

---

## Checklist de implementación

### Backend

- [ ] Mantener separación `routes/controllers/services/models/middlewares/schemas/utils/migrations/seeds`.
- [ ] Mantener la lógica de negocio exclusivamente en `services/` (RN0–RN11 completas).
- [ ] Implementar rutas REST en plural bajo prefijo `/api`.
- [ ] Centralizar errores mediante `errorHandler`.
- [ ] Mantener formato `{ error: { code, message } }`.
- [ ] Configurar Mongoose con timestamps snake_case.
- [ ] Crear índices compuestos (`barber_id+start_at+end_at+status`, `client_id+start_at`, `client_id+expires_at`).
- [ ] Utilizar `.select()`, `.lean()` y projections.
- [ ] Usar transacciones con outbox para `Notification` al crear turnos.
- [ ] Implementar migraciones versionadas idempotentes.
- [ ] Crear seeds determinísticos (`pnpm seed`).
- [ ] Guardar `price_snapshot` y `duration_snapshot` finales.
- [ ] Configurar bcryptjs con `saltRounds=10`.
- [ ] Implementar JWT con roles `client|barber|admin`.
- [ ] Aplicar autorización mediante `requireRole` + matriz por ruta.
- [ ] Filtrar turnos por `req.user.id` (excepción admin).
- [ ] Validar body/query mediante Zod.
- [ ] Configurar rate limiting en `/api/auth/*` y `POST /api/appointments`.
- [ ] Publicar Swagger en `/api-docs` con anotaciones en `routes/`.

### Frontend

- [ ] Mantener estrategia mobile-first.
- [ ] Usar `lg:` para desktop.
- [ ] Aplicar `loading="lazy"` en imágenes correspondientes.
- [ ] Implementar code splitting con `React.lazy` + `Suspense`.
- [ ] Separar bundle admin/client.
- [ ] Deshabilitar acciones de reserva durante `isPending`.
- [ ] Usar `tailwind-merge` + `clsx` para clases.

### API / documentación

- [ ] Usar ISO 8601 UTC.
- [ ] Mantener montos como `number` + `Math.round` en BE.
- [ ] Calcular precios, recargos y descuentos en backend.
- [ ] Publicar Swagger en `/api-docs`.
- [ ] Mantener anotaciones OpenAPI junto a las rutas.
- [ ] Utilizar Conventional Commits en español.
