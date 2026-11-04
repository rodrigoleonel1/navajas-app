

# Documentación de Casos de Prueba

Proyecto: Navajas (BarberApp)  
Versión: 1.1  
Fecha: 04/11/2026  
Autor: Rodrigo Alarcón

# 1\. Casos de prueba

Casos de prueba del núcleo de turnos y de las reglas de negocio críticas de V2/V3. Cada caso indica precondición, pasos y resultado esperado, y se marca sobre el deploy de la aplicación.  
Estados posibles: Pendiente / OK / Falla

## 1.1. Acceso por rol

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-01 | Login admin | Cuenta admin creada | 1\. Ir a /ingresar  2\. Ingresar email y contraseña  3\. Ingresar | Redirige a /app/agenda y muestra la vista de admin | Pendiente |
| CP-02 | Login barbero | Cuenta de barbero creada | 1\. Ir a /ingresar  2\. Ingresar email y contraseña 3\. Ingresar  | Redirige a /app/agenda y muestra la vista de barbero | Pendiente |
| CP-03 | Login cliente | Cuenta de cliente creada | 1\. Ir a /ingresar  2\. Ingresar email y contraseña 3\. Ingresar  | Redirige a /app/agenda y muestra la vista de cliente | Pendiente |
| CP-04 | Credenciales inválidas  | \- | Login con contraseña incorrecta  | Muestra mensaje de error, no inicia sesion | Pendiente |
| CP-05 | Ruta protegida | Sin sesión activa | Entrar a /app/admin/servicios | Redirige a /ingresar | Pendiente |
| CP-06 | Ruta de otro rol | Sesion cliente activa | Entrar a /app/admin/servicios | Lo devuelve a /app/agenda (su inicio)  | Pendiente |
| CP-07 | Cerrar sesión | Sesión activa | Click en salir  | Redirige a /ingresar y pide iniciar sesión de nuevo  | Pendiente |

## 1.2. Servicios (admin)

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-08 | Alta con validación | Sesión admin | 1\. Ir a Servicios 2\. Crear con nombre de 1 letra y precio 0 | Muestra errores, no crea nada | Pendiente |
| CP-09 | Alta válida | Sesión admin | Crear Corte prueba / 30 min / \$1000 | Toast Servicio creado, aparece en el listado | Pendiente |
| CP-10 | Editar | Servicio creado | En el detalle cambiar precio y guardar | Toast Servicio actualizado, persiste al recargar | Pendiente |
| CP-11 | Desactivar y reactivar | Servicio creado | Desactivar → verificar listado → reactivar | Desactivado sale del listado público y muestra Inactivo con ?all=1; reactivado vuelve | Pendiente |
| CP-12 | Permisos | Sesión cliente | Pedir GET /services?all=1 | 403; sin token 401 | Pendiente |

## 1.3. Barberos y horarios (admin)

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-13 | Editar jornada y francos | 1 barbero | En el detalle cambiar a 10:00–19:00 y agregar un franco, guardar | Toast Barbero actualizado, persiste y el listado muestra la jornada. Si la nueva disponibilidad deja turnos pendientes afectados, el toast informa cuántos se cancelaron y cuántos no se pudieron cancelar | Pendiente |
| CP-14 | Jornada inválida | Detalle abierto | Poner salida 09:00 con entrada 18:00 | Aviso, no llama al back | Pendiente |
| CP-15 | Reserva fuera de jornada | Sesión cliente; jornada 10:00–19:00 | Intentar reservar a las 08:00 | 400 OUT\_OF\_WORKING\_HOURS con mensaje claro | Pendiente |
| CP-16 | Reserva en franco | Sesión cliente; franco cargado | Reservar ese día | 400 BARBER\_DAY\_OFF | Pendiente |

## 1.4. Reserva (cliente)

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-17 | Reserva válida | Servicios \+ barbero activos | Elegir Corte, barbero, día y horario → Confirmar | Va a Mis turnos con toast Turno reservado, el turno aparece en Próximos | Pendiente |
| CP-18 | Horario ocupado | Turno existente 10:00–10:30 | Reservar 10:00 (o 09:30–10:00) con el mismo barbero | 409 CONFLICT con mensaje Horario no disponible para ese barbero y próximo horario sugerido | Pendiente |
| CP-19 | Varios servicios | 2 servicios activos | Reservar Corte \+ Barba | La duración y el precio son la suma, el slot respeta el total | Pendiente |
| CP-20 | Fechas en pantalla | Cualquier fecha visible | Mirar tira de días, francos y turnos | Todo en DD/MM/YYYY (ej. jue 15/10, 13/10/2026) | Pendiente |

## 1.5. Agenda por rol

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-21 | Mis turnos | Cliente con turnos | Abrir Mis turnos | Próximos e historial separados | Pendiente |
| CP-22 | Agenda barbero | Barbero con turnos | Abrir agenda, cambiar de día | Solo sus turnos del día, sin botones | Pendiente |
| CP-23 | Agenda admin | Varios turnos | Filtrar por barbero, fecha y estado | La lista respeta los 3 filtros | Pendiente |

## 1.6. Estados del turno (admin)

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-24 | Completar | Turno pendiente | Clic en Completar y confirmar | Toast Turno completado, sale de pendientes y entra al historial | Pendiente |
| CP-25 | Repetir cambio | Turno completado | Intentar completarlo de nuevo | 400, no cambia nada | Pendiente |
| CP-26 | Permiso | Sesión cliente | PATCH /appointments/:id | 403 | Pendiente |
| CP-27 | Cancelar | Turno pendiente, con vale aplicado | Clic en Cancelar, elegir motivo y confirmar | Toast Turno cancelado; queda cancelado sin costo con el motivo visible, libera el horario, devuelve el vale aplicado y emite un vale de 20% con aviso al cliente | Pendiente |

## 1.7. Reglas de negocio V2/V3

| ID | Caso | Precondición | Pasos | Resultado  esperado | Estado |
| :---- | :---- | :---- | :---- | :---- | :---- |
| CP-28 | Reserva en el pasado | Sesión cliente | Reservar con fecha y hora anteriores al momento actual | 400 VALIDATION\_ERROR con mensaje No se puede reservar un turno en el pasado; no crea nada | Pendiente |
| CP-29 | Reserva fuera de horizonte | Sesión cliente | Reservar con más de 4 meses de anticipación | 400 OUT\_OF\_HORIZON con el límite de 4 meses | Pendiente |
| CP-30 | Horario desalineado | Sesión cliente; apertura 09:00 | Reservar a las 09:07 | 400 INVALID\_SLOT con mensaje Horario inválido; sugiere un horario de la grilla | Pendiente |
| CP-31 | Solapamiento del mismo cliente | Cliente con turno 10:00–10:30 con el Barbero A; Barbero B libre | Reservar 10:00 con el Barbero B | 409 CLIENT\_CONFLICT con mensaje Ya tenés un turno reservado en ese horario | Pendiente |
| CP-32 | Servicios duplicados | Sesión cliente | Reservar Corte \+ Corte en la misma solicitud | La reserva se crea una sola vez: duración y precio equivalen a un único Corte | Pendiente |
| CP-33 | Cancelación con menos de 4 h | Turno pendiente que empieza en menos de 4 h | Cancelar como cliente | Queda cancelado con tipo blocked, no libera el horario (otro cliente recibe 409) y cuenta como inasistencia | Pendiente |
| CP-34 | Recargo por 3 inasistencias | Cliente con 3 inasistencias en los últimos 2 meses | Reservar un turno y luego completarlo | El turno suma 20% de recargo en el precio final; al completarse, las inasistencias quedan marcadas como usadas. Si el turno se cancela antes, siguen vigentes | Pendiente |
| CP-35 | Feriado con turnos pendientes | 1 turno pendiente en la fecha (con vale aplicado, opcional) | Cargar un feriado global en esa fecha | El turno se cancela automáticamente sin costo con motivo holiday, se libera el horario, se devuelve el vale usado (si tenía), se emite un vale de 20% y llega email \+ in-app | Pendiente |
| CP-36 | Oferta vencida | Oferta con fecha hasta anterior a hoy | Reservar la combinación de servicios de esa oferta | No aplica descuento: el precio es el base de los servicios | Pendiente |
