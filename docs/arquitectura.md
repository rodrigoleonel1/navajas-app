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
- **RN1 + RN10:** cálculo de disponibilidad (solapamiento + jornada laboral, francos por barbero y feriados globales).
- **RN2:** cálculo de duración total del turno según servicios.
- **RN3:** cálculo de la ventana de cancelación (≥24h / 4–24h / <4h).
- **RN4:** inasistencia manual por admin con tolerancia 15 min (no libera horario).
- **RN5:** conteo de inasistencias (3 en 2 meses) y aplicación del recargo del 20% con reinicio de contador.
- **RN6:** cálculo de comisión 60/40 sobre precio histórico.
- **RN7:** cancelación por admin → vale 20% con caducidad configurada.
- **RN8:** cada 10 turnos completados (10°,20°...) → vale fidelidad 30%.
- **RN9:** recordatorio del día anterior (Vercel Cron diario; ver Notificaciones y recordatorios).
- **RN11:** gestión de ofertas/combos con % descuento.

#### Cancelación, inasistencias y recargo (RN3/RN4/RN5)

Ventanas de cancelación del cliente:

| Momento | `cancel_type` | Libera horario | Cuenta inasistencia |
| :--- | :--- | :---: | :---: |
| `>= 24 h` | `free` | Sí | No |
| `4–24 h` | `late` | Sí | Sí |
| `< 4 h` | `blocked` | No | Sí |

Un turno ya iniciado no se puede cancelar. El admin cancela con `PATCH /api/appointments/:id` y `status: "cancelled"`; se guarda `cancel_type: "free"` (libera el horario y no cuenta inasistencia) y, dentro de la misma transacción, se emite un vale del 20% (RN7). La inasistencia se marca con `PATCH /api/appointments/:id/no-show` recién 15 minutos después del inicio; pasa a `status: "no_show"` y no libera el horario. La UI del admin oculta la acción hasta que se cumple la tolerancia; el backend vuelve a validarla.

Un turno ocupa la agenda si está `pending`, `no_show` o `cancelled` con `cancel_type: "blocked"`. Los turnos `cancelled` `free`/`late` y los `completed` liberan el horario.

RN5 se evalúa al reservar: se cuentan los turnos del cliente con `no_show` o `cancelled` `late`/`blocked` de los últimos 2 meses que tengan `penalty_used: false`. La ventana se calcula en meses calendario y, si el día no existe en el mes destino, se ajusta al último día de ese mes (por ejemplo, `31/08` → `30/06`). Con 3 o más, la reserva nueva suma un recargo del 20% en `extra` (redondeado con `Math.round`) y esas inasistencias pasan a `penalty_used: true` para reiniciar el contador. La evaluación y el reinicio ocurren dentro de la misma transacción de la reserva: si la reserva falla, las inasistencias no se consumen.

Después de RN5, si el cliente tiene un vale vigente se aplica **uno solo** (el de vencimiento más próximo) sobre el precio con recargo. `voucher_discount` guarda el descuento en pesos y `price_snapshot` queda como `max(base + extra - voucher_discount, 0)`. No se guarda `base_price`: el precio base se deriva como `price_snapshot - extra + voucher_discount`.

La API expone `cancelType`, `extra`, `voucherId` y `voucherDiscount`. En un turno `pending`, `cancelType` es la ventana proyectada; en `cancelled`, el valor real; en otros estados, `null`. `priceSnapshot` es el total final.

#### Ingresos y liquidación (RN6)

La comisión del barbero se calcula por cada turno `completed` sobre el `price_snapshot` completo, es decir, después del recargo de RN5 y del vale aplicado: `Math.round(price_snapshot * 0.6)`. La parte del local es `price_snapshot - comisión`. No se agrega un campo de comisión: se usa el precio histórico para que los cambios posteriores de servicios no alteren liquidaciones pasadas.

El día de imputación es el día comercial de `start_at` en `America/Argentina/Buenos_Aires`, no la fecha en que se marcó el turno como completado. El barbero consulta `GET /api/barbers/me/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD` (rango máximo 366 días); la UI usa día, semana (lunes a hoy) o mes (día 1 a hoy). El admin consulta `GET /api/barbers/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD`, que devuelve los totales del período, la serie diaria y el detalle por barbero: todos los activos —aunque tengan cero turnos— más los inactivos que tuvieron turnos completados en el rango.

La pantalla del barbero (`/app/barbero/ingresos`) muestra la comisión con un gráfico Recharts. La pantalla del admin (`/app/admin/ingresos`, label “Ingresos”) usa el mismo selector día/semana/mes (la fecha es la referencia del período), muestra comisión, parte local y total por barbero, y grafica la comisión por día en semana y mes. En `/app/admin/reportes` los ingresos quedan solo como totales del rango, sin detalle por barbero. No se registra el pago ni se marca la liquidación como pagada en esta versión.

#### Notificaciones in-app y recordatorios (RN0/RN9)

Cada evento de turno crea dos registros en `notifications`: uno por `email` y otro por `in_app`. Los emails nacen `pending` y se envían de forma asíncrona; si el envío falla quedan en `failed` con el error en `last_error`. Los avisos in-app nacen `sent` y quedan pendientes de lectura hasta que el destinatario los abre (`read_at`). La creación es idempotente por `appointment_id + type + channel + target_user_id`.

Eventos notificados: confirmación (RN0), cancelación del cliente (RN3), cancelación del admin (RN7), inasistencia (RN4), recordatorio (RN9), turno completado (agradecimiento) y emisión de vale (RN7). La cancelación del admin informa que fue con anticipación y sin penalización, y el aviso de vale enlaza a `/app/vales`. El aviso in-app de confirmación menciona la oferta, el recargo de RN5 y el vale aplicados, si los hubo. Cliente, barbero y admin ven una campana en el navbar con el contador de no leídos: el cliente recibe los avisos de sus turnos y el staff (barbero del turno + admins activos) recibe `nuevo_turno_staff`, `cancelacion_turno_staff` e `inasistencia_turno_staff`, solo in-app y enlazados a `/app/agenda`. El staff no recibe email por estos eventos y quien hace la acción no se auto-notifica. El frontend hace polling cada 5 segundos y lo pausa cuando la pestaña está oculta; al abrir el panel también refresca, y reservar o cancelar dispara un refresco inmediato. La bandeja no tiene página dedicada en esta versión.

El recordatorio corre con **Vercel Cron** una vez por día. El plan Hobby solo permite una ejecución diaria, así que el schedule es `0 15 * * *` UTC: **12:00 de Argentina** (Vercel puede ejecutarlo dentro de la hora, entre 12:00 y 12:59). El endpoint busca turnos `pending` del **día comercial siguiente** y crea el email + aviso in-app. No es una ventana exacta de 24 h: según la hora del turno, el aviso llega aproximadamente entre 12 y 36 h antes. La idempotencia evita duplicados si Vercel reintenta la ejecución.

El endpoint del cron se protege con `Authorization: Bearer <CRON_SECRET>`. Configurar `CRON_SECRET` en Vercel y en `backend/.env` para desarrollo local. Si la variable falta, el endpoint responde `503 CRON_NOT_CONFIGURED`. Para probarlo localmente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/reminders
```

Endpoints de bandeja (cualquier rol autenticado; cada uno ve solo sus avisos):

```text
GET   /api/notifications?limit=20
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
GET   /api/cron/reminders             # Authorization: Bearer <CRON_SECRET>
```

`GET /api/notifications` devuelve `{ items, unread }`. El límite máximo es 50 y el default 20. Los avisos incluyen `title`, `message`, `link`, `createdAt` y `readAt`.

#### Vales (RN7/RN8)

La cancelación del admin es una operación atómica: en la misma transacción se marca el turno como `cancelled` con `cancel_type: "free"` y se crea el `Voucher` del 20%. La emisión es idempotente por `source_appointment_id + source` (`admin_cancellation`), así que un reintento no duplica el vale.

Al completar un turno, la misma transacción cuenta los turnos `completed` del cliente y, si el total es múltiplo de 10, emite un vale `fidelity` del 30% (RN8). La caducidad se fija al emitir según la configuración vigente en ese momento.

La duración se configura con el singleton `voucher_configs` (`key: "default"`). Los campos `admin_cancellation_days` y `fidelity_days` aceptan enteros de 1 a 365 y por defecto son 30. El admin los consulta y actualiza con `GET/PATCH /api/voucher-config`; la pantalla es `/app/admin/config-vales`.

El progreso de fidelidad del cliente se consulta con `GET /api/vouchers/fidelity`, que devuelve los turnos completados, el ciclo actual de 10 y cuántos faltan para el próximo vale.

Al reservar, el service busca el vale vigente del cliente (`used_at: null` y `expires_at > now`), ordena por vencimiento más próximo y reserva **uno solo** de forma atómica. Si la reserva falla, la transacción devuelve el vale a disponible. El turno guarda `voucher_id` y `voucher_discount`; el descuento se calcula después de RN5 y el total final queda en `price_snapshot`.

El cliente ve sus vales en `/app/vales` (`GET /api/vouchers`, solo los propios). El estado se calcula al consultar: `active`, `used` o `expired`. Si un turno con vale aplicado se cancela después, el vale no se restaura automáticamente en esta versión. La misma pantalla muestra la tarjeta de penalizaciones con `GET /api/penalties` (inasistencias sin usar de los últimos 2 meses, umbral y recargo), y `/app/agenda` muestra un aviso cuando el recargo de RN5 se va a aplicar en la reserva.

#### Ofertas y combos (RN11)

El admin gestiona las ofertas desde `/app/admin/ofertas` (`GET/POST/PATCH /api/offers`). Una oferta tiene `name`, `service_ids` (uno o más servicios), `discount_percent` (entero de 1 a 100), `valid_from`/`valid_to` opcionales y `active`. Los `service_ids` se guardan ordenados por `_id` para que la comparación sea determinista y solo se pueden ofertar servicios activos.

La oferta se aplica al reservar **solo si el conjunto de servicios elegidos coincide exactamente** con el de la oferta (mismo conjunto, sin importar el orden). Por ejemplo, una oferta del 25% en corte no aplica a corte + barba. Si varias ofertas activas coinciden, gana la de mayor descuento y no se acumulan. La búsqueda (`findMatchingOffer`) corre dentro de la transacción de la reserva.

Las fechas `valid_from`/`valid_to` son **informativas**: se muestran al cliente como vigencia de la promo, pero no condicionan la aplicación. La oferta aplica mientras `active` sea `true`; si la promo vence, el admin debe desactivarla. Se almacenan como fecha calendario UTC 00:00 (`YYYY-MM-DD`) y se muestran como `DD/MM/YYYY`.

Orden de precios al reservar: precio base de los servicios → descuento de la oferta (RN11) → recargo de RN5 sobre el precio con descuento → vale (RN7/RN8). `offer_discount` y `voucher_discount` guardan los montos en pesos y `price_snapshot` el total final. El turno guarda `offer_id` y `offer_discount` (0 si no hubo oferta). El detalle del turno y el email de confirmación muestran el desglose.

Los controllers únicamente deben recibir la petición, delegar al service y construir la respuesta HTTP.

#### Calificación de barberos (EP-7 / CA-21)

El cliente califica con 1 a 5 estrellas un turno **propio** en estado `completed`. La nota se guarda embebida en el turno (`rating` y `rated_at`): una sola calificación por turno e **inmutable** (no se edita ni se borra). `POST /api/ratings` recibe `{ appointmentId, score }`, valida ownership y estado, y responde `409 ALREADY_RATED` si el turno ya fue calificado.

El promedio es **interno de la barbería**: se calcula al vuelo con una agregación sobre turnos `completed` con `rating != null`, agrupados por `barber_id`, redondeado a 1 decimal. `GET /api/barbers` incluye `ratingAverage` y `ratingCount` solo cuando el solicitante es admin; el cliente que reserva no los recibe. El detalle de barbero, el listado de barberos y el detalle de turno muestran la nota. El reporte de calificación promedio (HU-19) se calcula en `GET /api/reports`, con promedio general y por barbero para el rango de fechas.

### API REST

Todas las rutas bajo prefijo `/api`. Usar nombres de recursos en plural:

```text
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/services
GET    /api/services/popular?limit=3             # landing: más pedidos
GET    /api/barbers
GET    /api/barbers/me/earnings?from=...&to=...   # barbero
GET    /api/barbers/earnings?from=...&to=...      # admin: comisiones del período
GET    /api/reports?from=...&to=...              # admin: reportes del negocio
GET    /api/holidays?scope=upcoming|past&page=1&limit=10   # total en X-Total-Count
POST   /api/holidays
PATCH  /api/holidays/:id
DELETE /api/holidays/:id
POST   /api/appointments
GET    /api/appointments?barberId=...&date=...
PATCH  /api/appointments/:id            # admin: completed | cancelled
PATCH  /api/appointments/:id/cancel     # cliente
PATCH  /api/appointments/:id/no-show    # admin
GET    /api/vouchers
GET    /api/vouchers/fidelity                   # cliente: progreso RN8
GET    /api/penalties                           # cliente: inasistencias RN5
GET    /api/voucher-config               # admin
PATCH  /api/voucher-config               # admin
GET    /api/offers                       # activas (auth opcional)
GET    /api/offers?all=1                 # admin: incluye inactivas
POST   /api/offers                       # admin
PATCH  /api/offers/:id                   # admin
POST   /api/ratings
GET    /api/notifications?limit=20              # bandeja in-app (todos los roles)
PATCH  /api/notifications/:id/read              # bandeja in-app
PATCH  /api/notifications/read-all              # bandeja in-app
GET    /api/cron/reminders                      # Vercel Cron (CRON_SECRET)
```

Ejemplos:

```http
POST /api/appointments
GET /api/appointments?barberId=...&date=2026-09-11
PATCH /api/appointments/:id/cancel
PATCH /api/appointments/:id/no-show
```

Los endpoints `/api/holidays` son exclusivos del rol `admin`. La disponibilidad los refleja automáticamente en `nonWorkingDays` y bloquea la reserva con `HOLIDAY`. Los endpoints `/api/voucher-config` también son exclusivos del rol `admin`; `/api/vouchers` y `/api/penalties` son del cliente y solo devuelven sus propios datos. `GET /api/offers` devuelve solo las activas y `?all=1` requiere rol `admin`; `POST` y `PATCH` son exclusivos del `admin`.

`GET /api/reports?from=...&to=...` es exclusivo del rol `admin` y devuelve, para el rango de días comerciales: ingresos totales (RN6), ausencias de clientes por barbero (`no_show` + cancelaciones `late`/`blocked`), calificación promedio general y por barbero (EP-7) y el top 5 de servicios, barberos y horarios solicitados. El detalle por barbero del rango vive en `GET /api/barbers/earnings`. El promedio de calificaciones considera solo turnos `completed` con `rating != null`, imputados por el día comercial de `start_at`; se redondea a 1 decimal y es `null` cuando no hay notas en el período.

> `PATCH /api/appointments/:id/cancel` es del cliente y no acepta body. El admin usa `PATCH /api/appointments/:id` con `{status:'completed'|'cancelled'}`. La inasistencia tiene endpoint propio para validar la tolerancia de 15 minutos.

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

Los middlewares de autenticación (`authenticate`, `optionalAuthenticate`, `requireRole`, `requireCronSecret`) también delegan en `errorHandler` mediante `createAppError`, para no duplicar el formato de respuesta.

Códigos de autenticación:

| Código | HTTP | Cuándo |
|---|---|---|
| `UNAUTHORIZED` | 401 | Falta el token, está mal formado o expiró |
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos en el login |
| `ACCOUNT_DISABLED` | 401 | La cuenta existe pero está desactivada |
| `FORBIDDEN` | 403 | El rol autenticado no tiene permiso para la acción |

---

## 2. Base de Datos Mongoose (MongoDB Atlas)

### Colecciones y modelos

Las colecciones deben utilizar nombres **snake_case y plural**:

```text
appointments
holidays
services
offers
vouchers
voucher_configs
users
notifications
```

Los modelos deben utilizar nombres **PascalCase y singular**:

```text
Appointment
Holiday
Service
Offer
Voucher
VoucherConfig
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
    daysOff: [Date],        // francos puntuales / vacaciones del barbero
    weeklyDaysOff: [Number] // francos semanales: 0=domingo ... 6=sábado
  }
}
```

```js
// holidays: configuración global del negocio
{
  date: Date, // fecha calendario UTC 00:00, unique
  name: String
}
```

Los feriados **no** se guardan por barbero: aplican a todos los barberos, incluidos los creados después. Los francos (`daysOff` / `weeklyDaysOff`) sí son propios de cada barbero.

`appointments.barber_id` y `appointments.client_id` referencian `users._id` con validación `role === 'barber'|'client'`.

EP-7: la calificación del cliente vive en el turno (`rating`: 1–5, `rated_at`: Date), no en una colección aparte. Así una calificación por turno queda garantizada por construcción y el promedio se agrega sobre `appointments`.

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
  .select('barber_id client_id start_at end_at status cancel_type extra price_snapshot voucher_id voucher_discount offer_id offer_discount')
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
// RN5: inasistencias del cliente todavía no usadas para el recargo
appointmentSchema.index({ client_id: 1, penalty_used: 1, start_at: 1 });
// rango temporal general
appointmentSchema.index({ start_at: 1 });
// EP-7: promedio por barbero sobre turnos completados y calificados
appointmentSchema.index({ barber_id: 1, status: 1, rating: 1 });
```

> Antes: 4 índices separados `barber_id+start_at`, `client_id`, `status`, `start_at` → optimizado a compuestos para queries de rango `$lt/$gt` en solapamiento.

#### `offers`

```js
// Listado de ofertas activas.
offerSchema.index({ active: 1 });
// Coincidencia exacta del conjunto de servicios al reservar.
offerSchema.index({ service_ids: 1, active: 1 });
```

#### `vouchers`

Índice compuesto (sin `status` porque se calcula al vuelo según `FRD CA-12` vigente/usado/vencido):

```js
voucherSchema.index({ client_id: 1, expires_at: 1 });
// Idempotencia de emisión por turno de origen.
voucherSchema.index(
  { source_appointment_id: 1, source: 1 },
  { unique: true },
);
// Próximo vale a aplicar: cliente + no usado + vigencia.
voucherSchema.index({ client_id: 1, used_at: 1, expires_at: 1 });
```

#### `voucher_configs`

```js
// Singleton de configuración.
voucherConfigSchema.index({ key: 1 }, { unique: true });
```

#### `users`

```js
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
```

#### `holidays`

```js
// Una sola definición por fecha; acelera la consulta de disponibilidad.
holidaySchema.index({ date: 1 }, { unique: true });
```

La disponibilidad de un barbero se bloquea si el día es feriado global **o** franco semanal **o** franco puntual. Los feriados se consultan por rango y se pasan como `Set` de `YYYY-MM-DD` a la lógica de slots.

#### `notifications`

```js
// Idempotencia: un registro por turno + tipo + canal.
notificationSchema.index(
  { appointment_id: 1, type: 1, channel: 1, target_user_id: 1 },
  { unique: true },
);
// Bandeja in-app: últimos avisos del usuario.
notificationSchema.index({
  target_user_id: 1,
  channel: 1,
  status: 1,
  created_at: -1,
});
// Contador de no leídos.
notificationSchema.index({
  target_user_id: 1,
  channel: 1,
  status: 1,
  read_at: 1,
});
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
  // 2. Obtener precio base de servicios y aplicar oferta RN11 (coincidencia exacta)
  // 3. Aplicar RN5 (recargo 20% si corresponde) → RN7 (vale vigente, uno solo) en BE
  //    Usar Math.round para evitar errores float en %
  // 4. Guardar price_snapshot y duration_snapshot FINALES (histórico real cobrado)
  // 5. Crear Appointment
});
// 6. Encolar Notification (outbox) fuera de la transacción → email (Nodemailer/Resend) + in-app
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

`Appointment` debe guardar snapshots finales (tras aplicar oferta, recargo y vale):

```text
price_snapshot
duration_snapshot
extra
offer_id
offer_discount
voucher_id
voucher_discount
```

`price_snapshot` es el total final cobrado, `extra` el recargo aplicado (0 si no hubo), `offer_discount` el descuento en pesos de la oferta RN11 (0 si no se aplicó) y `voucher_discount` el descuento en pesos del vale (0 si no se aplicó). El precio base se deriva como `price_snapshot - extra + voucher_discount + offer_discount`. Esto permite que un cambio posterior en el servicio no altere la información histórica de turnos ya creados.

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
| `PATCH /api/appointments/:id` |  |  | ✓ | `completed` o `cancelled`; cancelación admin libre y emite vale RN7 |
| `PATCH /api/appointments/:id/cancel` | ✓ (propio) |  |  | RN3, verificar ownership |
| `PATCH /api/appointments/:id/no-show` |  |  | ✓ | RN4, tolerancia 15 min |
| `POST /api/ratings` | ✓ (propio) |  |  | EP-7: turno completado, una sola nota inmutable |
| `POST /api/barbers` |  |  | ✓ | CA-3, alta barbero |
| `GET /api/barbers/me/earnings` |  | ✓ |  | `barber_id = req.user.id`; rango máximo 366 días |
| `GET /api/barbers/earnings` |  |  | ✓ | Comisiones del período; activos con cero turnos incluidos |
| `GET /api/notifications` | ✓ (propios) | ✓ (propios) | ✓ (propios) | `target_user_id = req.user.id`; solo canal `in_app` |
| `PATCH /api/notifications/:id/read` | ✓ (propio) | ✓ (propio) | ✓ (propio) | Verifica ownership del aviso |
| `PATCH /api/notifications/read-all` | ✓ (propios) | ✓ (propios) | ✓ (propios) | Marca todos los no leídos |
| `GET /api/cron/reminders` |  |  |  | Protegido por `CRON_SECRET`, no por JWT |
| `POST /api/offers` |  |  | ✓ | RN11: crear oferta/descuento |
| `GET /api/offers` | ✓ | ✓ | ✓ | Solo activas; `?all=1` requiere admin |
| `PATCH /api/offers/:id` |  |  | ✓ | RN11: editar, activar o desactivar |
| `GET /api/vouchers` | ✓ (propios) |  |  | `client_id = req.user.id` |
| `GET /api/vouchers/fidelity` | ✓ (propio) |  |  | Progreso RN8: completados, ciclo de 10 y faltantes |
| `GET /api/voucher-config` |  |  | ✓ | Configuración de duración de vales RN7/RN8 |
| `PATCH /api/voucher-config` |  |  | ✓ | `adminCancellationDays` y `fidelityDays` entre 1 y 365 |

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
- **Recharts:** gráficos de ingresos y liquidaciones del panel.
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
- **RN9:** recordatorios mediante Vercel Cron diario a las 12:00 de Argentina.

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
- [ ] Crear índices compuestos (`barber_id+start_at+end_at+status`, `client_id+start_at`, `client_id+expires_at`, `client_id+used_at+expires_at`).
- [ ] Utilizar `.select()`, `.lean()` y projections.
- [ ] Usar transacciones con outbox para `Notification` al crear turnos.
- [ ] Implementar migraciones versionadas idempotentes.
- [ ] Crear seeds determinísticos (`pnpm seed`).
- [ ] Guardar `price_snapshot`, `offer_id`, `offer_discount`, `voucher_id`, `voucher_discount` y `duration_snapshot` finales.
- [ ] Configurar bcryptjs con `saltRounds=10`.
- [ ] Implementar JWT con roles `client|barber|admin`.
- [ ] Aplicar autorización mediante `requireRole` + matriz por ruta.
- [ ] Filtrar turnos por `req.user.id` (excepción admin).
- [ ] Validar body/query mediante Zod.
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
