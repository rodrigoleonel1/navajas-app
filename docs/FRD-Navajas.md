

# Documentación de Requerimientos Funcionales

Proyecto: Navajas (BarberApp)  
Versión: 1.0  
Fecha: 07/09/2026  
Autor: Rodrigo Alarcón

# 

# Tabla de contenidos

[**Documentación de Requerimientos Funcionales	0**](#documentación-de-requerimientos-funcionales)

[**Tabla de contenidos	1**](#tabla-de-contenidos)

[**1\. Historial de cambios	1**](#1.-historial-de-cambios)

[**2\. Alcance	1**](#2.-alcance)

[2.1. Descripción del proyecto / objetivos	1](#2.1.-descripción-del-proyecto-/-objetivos)

[2.2. Justificación	1](#2.2.-justificación)

[2.3. Hipótesis	2](#2.3.-hipótesis)

[2.4. Restricciones	2](#2.4.-restricciones)

[2.5. Dependencias	2](#2.5.-dependencias)

[2.6. Alcance del proyecto	2](#2.6.-alcance-del-proyecto)

[**3\. Información de requerimientos de negocio	2**](#3.-información-de-requerimientos-de-negocio)

[3.1. Reglas de negocio	2](#3.1.-reglas-de-negocio)

[3.2. Casos de estudio	4](#3.2.-casos-de-estudio)

[**4\. Alcance por Etapas	4**](#4.-alcance-por-etapas)

[4.1. V1 \- MVP funcional básico	4](#4.1.-v1---mvp-funcional-básico)

[4.2. V2 \- Reglas de negocio \+ notificaciones completas	5](#4.2.-v2---reglas-de-negocio-+-notificaciones-completas)

[4.3. V3 — Fidelización, reportes y pulido final	5](#4.3.-v3-—-fidelización,-reportes-y-pulido-final)

[**5\. Requerimientos funcionales	6**](#5.-requerimientos-funcionales)

[5.1. Historias de usuario	6](#5.1.-historias-de-usuario)

[5.2. Criterios de bondad	11](#5.2.-criterios-de-bondad)

[**6\. Pantallas de usuario	11**](#6.-pantallas-de-usuario)

[**7\. Glosario	12**](#7.-glosario)

# 1\. Historial de cambios

| Versión | Fecha | Autor | Descripción |
| :---- | :---- | :---- | :---- |
| 1.0 | 07/09/2026 | Alarcón Rodrigo | Versión inicial |

# 2\. Alcance

## 2.1. Descripción del proyecto / objetivos

Desarrollar una aplicación web (Navajas) que permita a los clientes de una barbería reservar turnos online, calificar a los barberos y acceder a vales de descuento; y que permita al personal (barberos y administración) gestionar la agenda, los servicios, los barberos, las ofertas y los reportes del negocio.

## 2.2. Justificación

Realizar una correcta gestión de turnos, evitando solapamientos y errores manuales, con el fin de optimizar el tiempo de los barberos, reducir inasistencias y mejorar la fidelización de los clientes.

## 2.3. Hipótesis

En la asignación de turnos se priorizará la disponibilidad real del barbero (jornada laboral, días libres y feriados) y la duración total de los servicios solicitados, evitando solapamientos en la agenda. 

## 2.4. Restricciones

Este requerimiento no tiene restricciones identificadas.

## 2.5. Dependencias

Este requerimiento no tiene dependencias con otros proyectos o funcionalidades. 

## 2.6. Alcance del proyecto

El alcance incluye desde la reserva del turno por parte del cliente hasta el envío de notificaciones de confirmación, recordatorio, cancelación e inasistencia por email y notificación in-app, así como la gestión de vales, ofertas/combos, calificaciones a barberos y reportes de administración. 

# 3\. Información de requerimientos de negocio

## 3.1. Reglas de negocio

| Regla | Descripción |
| :---- | :---- |
| Regla 0 | Siempre enviar un mensaje de confirmación (email \+ notificación in-app) al cliente al reservar un turno. |
| Regla 1 | No permitir reservar un turno si el barbero ya tiene otro turno asignado que se superponga con el horario y la duración del/los servicio(s) solicitado(s). |
| Regla 2 | La duración del turno se calcula según el/los servicio(s) elegidos. Un turno puede combinar varios servicios (ej.: Corte \+ Decoloración). |
| Regla 3 | Cancelación ≥24hs de anticipación: sin penalización, libera el horario. Entre 4hs y 24hs: libera el horario y registra inasistencia. \<4hs: no libera el horario y registra inasistencia. |
| Regla 4 | Si el cliente no se presenta (tolerancia de 15 min) y no canceló previamente, el administrador marca manualmente el turno como "Inasistencia"; el horario no se libera. |
| Regla 5 | 3 inasistencias en los últimos 2 meses → recargo del 20% en la próxima reserva. Al aplicarse, el contador de inasistencias se reinicia. |
| Regla 6 | Cada barbero cobra el 60% del precio total de cada turno completado (40% para el local), calculado sobre el precio histórico vigente al momento de la reserva. |
| Regla 7 | Cancelación por parte del administrador → notifica motivo al cliente y emite automáticamente un vale de 20% de descuento (fecha de caducidad según configuración). |
| Regla 8 | Cada 10 turnos completados (10°, 20°, 30°...) → el cliente recibe automáticamente un vale de fidelidad del 30% de descuento. |
| Regla 9 | Enviar un recordatorio automático (email \+ notificación in-app) 24 horas antes del horario del turno. |
| Regla 10 | No permitir reservar turnos en días feriados/no laborables, ni fuera de la jornada laboral configurada para cada barbero. |
| Regla 11 | El administrador puede activar/desactivar ofertas/combos de servicios con % de descuento, aplicados automáticamente al precio del turno. |

Tabla de decisión: define qué notificación o acción se dispara según la condición que se cumple, de acuerdo a las reglas de negocio anteriores.

| Condición | Regla aplicada | Notificacion / Acción |
| :---- | :---- | :---- |
| Turno reservado exitosamente | RN0 | Msj0 \- Confirmación (email \+ in-app) |
| Horario solicitado ocupado | RN1 | Msj\_Error \- Horario no disponible \+ próxima opción |
| 24hs antes del turno | RN9 | Msj9 \- Recordatorio (email \+ in-app) |
| Cancelación ≥ 24hs antes | RN3 | Msj\_CancelacionOK \- Sin penalización |
| Cancelación entre 4-24hs antes | RN3 | Msj\_CancelacionConInasistencia |
| Cancelación \< 4hs antes | RN3 | Msj\_CancelacionSinLiberar |
| Cliente no se presenta (+15 min) | RN4 | Msj\_Inasistencia \- Registrada por el admin |
| 3ra inasistencia en 2 meses | RN5 | Msj\_Recargo \- 20% en próxima reserva |
| Admin cancela un turno | RN7 | Msj\_CancelacionAdmin \+ Msj\_Vale (20% dto.) |
| Cliente completa 10°, 20°, 30°... turno | RN8 | Msj\_ValeFidelidad (30% dto.) |
| Turno marcado como completado | \- | Msj\_Agradecimiento |

## 3.2. Casos de estudio

* Cliente 1:  
  * Condición: Reserva un turno de "Corte \+ Barba" con el Barbero A el 10/09 a las 15:00hs. El Barbero A está libre en esa franja.  
  * Notificaciones: Msj0 (RN0), Msj9 (RN9).  
* Cliente 2:  
  * Condición: Intenta reservar con el Barbero B a las 10:00hs, pero el Barbero B ya tiene un turno de 9:45 a 10:15hs.  
  * Notificaciones: Msj\_Error (RN1) \+ sugerencia de próximo horario disponible.  
* Cliente 3:  
  * Condición: Cliente con 3 inasistencias en los últimos 2 meses reserva un nuevo turno.  
  * Notificaciones: Msj0, Msj\_Recargo (RN5, \+20% en esta reserva), Msj9.  
* Cliente 4:  
  * Condición: Cancela un turno con 20hs de anticipación (dentro de la ventana 4-24hs).  
  * Notificaciones: Msj\_CancelacionConInasistencia (RN3: libera el horario, pero cuenta como inasistencia).  
* Cliente 5:  
  * Condición: Cancela un turno con 2hs de anticipación (menos de 4hs antes).  
  * Notificaciones: Msj\_CancelacionSinLiberar (RN3: no libera el horario y cuenta como inasistencia).  
* Cliente 6:  
  * Condición: No se presenta al turno y no había cancelado; pasan 15 minutos de tolerancia y el admin lo marca manualmente.  
  * Notificaciones: Msj\_Inasistencia (RN4).  
* Cliente 7:  
  * Condición: El administrador cancela el turno del cliente porque el barbero asignado tuvo una emergencia.  
  * Notificaciones: Msj\_CancelacionAdmin \+ Msj\_Vale, 20% de descuento (RN7).  
* Cliente 8:  
  * Condición: El cliente completa su 10° turno en el local.  
  * Notificaciones: Msj\_Agradecimiento \+ Msj\_ValeFidelidad, 30% de descuento (RN8).

# 4\. Alcance por Etapas 

## 4.1. V1 \- MVP funcional básico

* Objetivo: un cliente puede reservar un turno real, y el admin puede operar el día a día. Sin reglas de penalización todavía.  
* Auth: signup cliente (/signup), login único (/login) con roles, seed del admin, alta de barberos por el admin.  
* Servicios: CRUD básico (nombre, duración, precio) — solo admin.  
* Barberos: alta/baja \+ jornada laboral (horario de entrada/salida) y días libres — solo admin.  
* Reserva de turno: cliente elige servicio(s) \+ barbero \+ horario disponible. Validar que no haya solapamiento (RN1) y que respete la jornada laboral (RN10, sin feriados todavía).  
* Mis turnos: cliente ve próximos turnos e historial simple (sin vales ni penalizaciones aún).  
* Agenda del barbero: sólo lectura, por día.  
* Agenda del admin: ve todos los turnos, puede marcar completado (sin manejar inasistencia todavía).  
* Notificación de confirmación por email (Nodemailer/Resend) — un solo canal, sin in-app todavía.  
* Deploy: Vercel \+ MongoDB Atlas conectado y funcionando.  
* Con esto ya tenés un producto demostrable: reservar, ver la agenda, completar un turno.

## 4.2. V2 \- Reglas de negocio \+ notificaciones completas

* Objetivo: sumar la lógica que hace que el sistema sea "inteligente" y no un simple calendario.  
* Feriados/días no laborables (completa RN10).  
* Cancelación con reglas (RN3): ≥ 24hs sin penalización, 4-24hs libera pero cuenta inasistencia, \< 4hs no libera y cuenta inasistencia.  
* Inasistencia manual por admin con tolerancia de 15 min (RN4).  
* Recargo del 20% a la 3ra inasistencia en 2 meses, con reseteo del contador (RN5).  
* Comisión 60/40: vista de ingresos del barbero (gráfico semana/mes) y liquidación diaria para el admin (RN6).  
* Notificaciones in-app (polling desde React) \+ recordatorio 24hs antes vía Vercel Cron (RN9).  
* Vale por cancelación del admin (20% dto., RN7) — sección "Vales" básica del cliente.  
* Validaciones con Zod en front y back ya integradas de forma consistente en los endpoints principales.  
* Con esto el sistema ya refleja el modelo de negocio completo de Navajas, no solo el CRUD de turnos.

## 4.3. V3 — Fidelización, reportes y pulido final

* Objetivo: funcionalidades que suman valor de producto y son ideales para lucir en la defensa, pero no bloquean el funcionamiento core.  
* Vale de fidelidad cada 10 turnos (30% dto., RN8) \+ configuración de duración de vales por el admin.  
* Ofertas/combos activables/desactivables (RN11) con aplicación automática de descuento.  
* Calificación a barberos (1-5 estrellas) \+ promedio visible.  
* Reportes completos (admin): inasistencia por barbero, ingresos totales/por barbero, más solicitados (barbero/horario/servicio/combo), calificación promedio.  
* Sección "Vales y Penalizaciones" completa del lado del cliente (vigente/usado/vencido calculado al vuelo).  
* Landing page pulida \+ diseño mobile-first terminado en todas las pantallas.  
* Sanitización de inputs más estricta (mongo-sanitize, rate limiting básico en login).

# 5\. Requerimientos funcionales

## 5.1. Historias de usuario

EP-1: Autenticación y gestión de usuarios

| Rol principal | Cliente / Admin |
| :---- | :---- |
| Prioridad | Alta |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Permite a clientes registrarse y loguearse, y al administrador dar de alta cuentas de barberos. Un único punto de acceso (/login) sirve a los tres roles, mostrando distinta interfaz según el rol. |
| Implementación | V1 |

Historias de usuario

* HU-1: Como cliente, quiero registrarme (/signup) con mis datos básicos, para poder reservar turnos.  
* HU-2: Como usuario (cliente/barbero/admin), quiero loguearme desde un único formulario (/login), para acceder a la vista correspondiente a mi rol.   
* HU-3: Como administrador, quiero crear cuentas de barberos, para que puedan acceder a su agenda e ingresos. 

Criterio de Aceptación 

* CA-1: El registro de cliente valida formato de email y contraseña segura (Zod en front y back).  
* CA-2: Tras el login, el sistema redirige a la vista correspondiente al rol dentro de /app.   
* CA-3: Solo el admin puede crear cuentas de barbero; el barbero no puede auto registrarse. 

Dependencias

* El admin inicial se crea mediante un script de seed, no mediante la interfaz.

EP-2: Reserva y Gestión de Turnos

| Rol principal | Cliente / Admin |
| :---- | :---- |
| Prioridad | Alta |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Cubre el flujo central del sistema: reserva de turnos por parte del cliente, cancelaciones, y la gestión operativa de turnos (completado/inasistencia/cancelación) por parte del administrador. |
| Implementación | V1/V2 |

Historias de usuario

* HU-4: Como cliente, quiero reservar un turno con uno o varios servicios, barbero y horario disponible (RN0, RN1, RN2, RN10).   
* HU-5: Como cliente, quiero cancelar un turno reservado, aplicando la Regla 3 según la anticipación.   
* HU-6: Como cliente, quiero ver mis próximos turnos y mi historial de turnos pasados.  
* HU-7: Como administrador, quiero marcar un turno como completado o como inasistencia (RN4, RN5).   
* HU-8: Como administrador, quiero cancelar un turno en casos excepcionales, notificando al cliente y emitiendo un vale (RN7).

Criterio de Aceptación 

* CA-4: El sistema no permite reservar en horarios solapados, fuera de la jornada laboral, ni en feriados/días libres del barbero.  
* CA-5: Al cancelar, el sistema aplica automáticamente la regla correspondiente según el tiempo de anticipación.  
* CA-6: El cliente ve claramente separados sus turnos futuros de su historial.  
* CA-7: Al marcar inasistencia, se actualiza el contador de inasistencias de los últimos 2 meses del cliente.  
* CA-8: Al cancelar el admin un turno, se genera automáticamente un vale de 20% con fecha de caducidad calculada.

Dependencias

* Depende de EP-1 (el cliente debe estar autenticado para reservar).

EP-3: Notificaciones

| Rol principal | Sistema |
| :---- | :---- |
| Prioridad | Alta |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Servicio de notificaciones desacoplado (patrón Strategy/Adapter) con dos canales reales: email (Nodemailer/Resend) y notificación in-app (Mongo \+ polling en React). |
| Implementación | V1/V2 |

Historias de usuario

* HU-9: Como cliente, quiero recibir un email y una notificación in-app al confirmar mi turno (RN0).  
* HU-10: Como cliente, quiero recibir un recordatorio 24hs antes de mi turno (RN9).  
* HU-11: Como cliente, quiero ser notificado si mi turno fue cancelado o marcado como inasistencia.

Criterio de Aceptación 

* CA-9: Toda notificación se registra en la colección notifications de Mongo, con canal, estado y regla de origen.  
* CA-10: El recordatorio de 24hs se dispara mediante un job programado (Vercel Cron) que revisa turnos próximos.  
* CA-11: Al cancelar un turno (por el cliente o por el admin) o al marcarlo como inasistencia, el sistema dispara automáticamente una notificación (email \+ in-app) informando al cliente el cambio de estado y el motivo, según corresponda. 

Dependencias

* Depende de EP-2 (las notificaciones se disparan a partir de eventos de turnos).

EP-4: Vales y Fidelización

| Rol principal | Cliente / Admin |
| :---- | :---- |
| Prioridad | Media |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Gestión de vales de descuento (por cancelación del admin o por fidelidad cada 10 turnos), y configuración de su duración por parte del administrador. |
| Implementación | V2/V3 |

Historias de usuario

* HU-12: Como cliente, quiero ver mis vales (origen, %, vigencia) y mis penalizaciones activas.  
* HU-13: Como cliente, quiero recibir automáticamente un vale de fidelidad cada 10 turnos completados (RN8).  
* HU-14: Como administrador, quiero configurar la duración en días de cada tipo de vale.

Criterio de Aceptación 

* CA-12: El estado del vale (vigente/usado/vencido) se calcula al consultar la lista, comparando la fecha de caducidad con la fecha actual.  
* CA-13: El vale de fidelidad se emite automáticamente al completar el 10°, 20°, 30°... turno, sin intervención manual.  
* CA-14: Al emitir un vale, su fecha de caducidad usa la duración configurada vigente en ese momento.

Dependencias

* Depende de EP-2 (los vales se generan a partir de eventos de turnos).

EP-5: Panel de barbero

| Rol principal | Barbero |
| :---- | :---- |
| Prioridad | Media |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Vista de solo lectura para el barbero: su propia agenda y sus ingresos, sin capacidad de modificar turnos ni configuración. |
| Implementación | V1/V2 |

Historias de usuario

* HU-15: Como barbero, quiero ver mi agenda de turnos por día y horario.  
* HU-16: Como barbero, quiero ver cuánto me corresponde cobrar (60% por servicio) con un gráfico de barras, alternando semana/mes (RN6).

Criterio de Aceptación 

* CA-15: El barbero sólo visualiza sus propios turnos, en modo de solo lectura (no puede marcar completado/inasistencia).  
* CA-16: El cálculo de ingresos usa el precio histórico del turno, no el precio actual del servicio.

Dependencias

* Depende de EP-1 y EP-2.

EP-6: Administración, ofertas y reportes

| Rol principal | Admin |
| :---- | :---- |
| Prioridad | Alta |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Panel de control del negocio: configuración de barberos/horarios/feriados, ofertas/combos, y reportes de performance del local. |
| Implementación | V1/V2/V3 |

Historias de usuario

* HU-17: Como administrador, quiero configurar horarios laborales, días libres y feriados de cada barbero (RN10).  
* HU-18: Como administrador, quiero activar/desactivar ofertas/combos de servicios con % de descuento (RN11).  
* HU-19: Como administrador, quiero ver reportes de inasistencias, ingresos, más solicitados y calificación promedio.  
* HU-20: Como administrador, quiero ver cuánto le corresponde cobrar a cada barbero por día, para gestionar las liquidaciones.

Criterio de Aceptación 

* CA-17: Los cambios de horario/feriados impactan de inmediato en la disponibilidad de turnos futuros.  
* CA-18: Al reservar una combinación de servicios con oferta activa, el precio refleja el descuento correspondiente.  
* CA-19: Los reportes son filtrables por rango de fechas.  
* CA-20: La liquidación diaria muestra, por barbero, el monto total del 60% de sus turnos completados ese día.

Dependencias

* Depende de EP-2 y EP-5.

EP-7: Calificación a barberos

| Rol principal | Cliente |
| :---- | :---- |
| Prioridad | Baja |
| Estado | Aprobado |
| Creado | 07/09/2026 |
| Actualizado | 07/09/2026 |
| Descripción | Permite al cliente calificar a un barbero (1 a 5 estrellas) luego de un turno completado, alimentando el reporte de calificación promedio del admin. |
| Implementación | V3 |

Historias de usuario

* HU-21: Como cliente, quiero calificar a un barbero con 1 a 5 estrellas luego de un turno completado.

Criterio de Aceptación 

* CA-21: La calificación queda asociada al barbero y al turno, y actualiza el promedio general del barbero.

Dependencias

* Depende de EP-2 (el turno debe estar en estado completado).

## 5.2. Criterios de bondad

* DISPONIBILIDAD DE BARBERO: franjas horarias libres de un barbero, calculadas en función de su jornada laboral configurada, sus días libres/feriados y los turnos ya asignados (RN1, RN10).  
* HISTORIAL DE CLIENTE: turnos previos del cliente (servicios, barberos, estado), usado para calcular inasistencias recientes (RN5) y turnos completados acumulados (RN8).  
* PRECIO HISTÓRICO DEL TURNO: precio de él/los servicio(s) vigente al momento de la reserva, usado para calcular la comisión del barbero (RN6), sin verse afectado por cambios de precio posteriores.  
* Generar Vale: calcular fecha de emisión y caducidad de un vale en base a la duración configurada por el administrador para su tipo (fidelidad o cancelación).

# 6\. Pantallas de usuario

* Pantalla NAV001 — Landing: presentación de la barbería, con acceso a "Reservar turno" (redirige a /login).  
* Pantalla NAV002 — Login (/login): acceso único para cliente, barbero y administrador.  
* Pantalla NAV003 — Registro de Cliente (/signup).  
* Pantalla NAV004 — Reserva de Turno: selección de uno o varios servicios, barbero y horario disponible.  
* Pantalla NAV005 — Próximos Turnos e Historial (Cliente).  
* Pantalla NAV006 — Vales y Penalizaciones (Cliente).  
* Pantalla NAV007 — Agenda e Ingresos (Barbero), con gráfico semana/mes.  
* Pantalla NAV008 — Agenda General y Gestión de Turnos (Admin).  
* Pantalla NAV009 — Configuración de Barberos, Horarios y Feriados (Admin).  
* Pantalla NAV010 — Configuración de Vales y Ofertas/Combos (Admin).  
* Pantalla NAV011 — Reportes y Liquidaciones (Admin).

# 7\. Glosario

| Término | Descripción |
| :---- | :---- |
| Criterio de aceptación | Condiciones que un producto de software debe satisfacer para ser aceptado por un usuario, cliente o stakeholder.  |
| Inasistencia | Ausencia del cliente a un turno reservado, ya sea por no presentarse o por cancelar fuera del plazo sin penalización.  |
| Vale | Beneficio de descuento porcentual, con fecha de emisión y caducidad, otorgado por fidelidad o por cancelación del administrador.  |
| Precio histórico | Precio de un servicio registrado en el momento exacto de la reserva de un turno, independiente de cambios de precio posteriores.  |
| EP (épica) | Agrupación de historias de usuario relacionadas funcionalmente, utilizada para organizar el desarrollo. |
| HU (historias de usuario) | Descripciones cortas y concisas contadas desde el punto de vista del usuario cuando prueba un producto digital. |

