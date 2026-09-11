

# Documentación de Requerimientos de negocio

Proyecto: Navajas (BarberApp)  
Versión: 1.0  
Fecha: 07/09/2026  
Autor: Rodrigo Alarcón

# 

# Tabla de contenidos

[**Tabla de contenidos	1**](#tabla-de-contenidos)

[**1\. Historial de cambios	1**](#1.-historial-de-cambios)

[**2\. Alcance	1**](#2.-alcance)

[2.1. Descripción del proyecto / objetivos	1](#2.1.-descripción-del-proyecto-/-objetivos)

[2.2. Justificación	1](#2.2.-justificación)

[2.3. Hipótesis	2](#2.3.-hipótesis)

[2.4. Restricciones	2](#2.4.-restricciones)

[2.5. Dependencias	2](#2.5.-dependencias)

[2.6. Alcance del proyecto	2](#2.6.-alcance-del-proyecto)

[**3\. Alcance	2**](#3.-requerimientos-de-negocio)

[3.1. Reglas de negocio	2](#3.1.-reglas-de-negocio)

[3.2. Casos de estudio	3](#3.2.-casos-de-estudio)

[**4\. Requerimientos funcionales	4**](#4.-requerimientos-funcionales)

[4.1. Historias de usuario	4](#4.1.-historias-de-usuario)

[4.2. Criterios de bondad	6](#4.2.-criterios-de-bondad)

[**5\. Pantallas de usuario	6**](#5.-pantallas-de-usuario)

[**6\. Glosario	6**](#6.-glosario)

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

# 3\. Requerimientos de negocio

## 3.1. Reglas de negocio

| Regla | Descripción |
| :---- | :---- |
| Regla 0 | Siempre enviar un mensaje de confirmación (email \+ notificación in-app) al cliente al reservar un turno.  |
| Regla 1 | No permitir reservar un turno si el barbero ya tiene otro turno asignado que se superponga con el horario y la duración del/los servicio(s) solicitado(s).  |
| Regla 2 | La duración del turno se calcula según el/los servicio(s) elegidos. Un turno puede combinar varios servicios (ej.: Corte \+ Decoloración).  |
| Regla 3 | Cancelación con 24hs o más de anticipación: sin penalización, libera el horario. Entre 4 y 24hs antes: libera el horario pero se registra como inasistencia. Menos de 4hs antes: no libera el horario y se registra como inasistencia.  |
| Regla 4 | Si el cliente no se presenta al turno (pasados 15 minutos de tolerancia) y no canceló previamente, el administrador marca manualmente el turno como "Inasistencia"; el horario no se libera.  |
| Regla 5 | Si un cliente acumula 3 inasistencias en los últimos 2 meses, se aplica un recargo del 20% en su próxima reserva. Al aplicarse, el contador de inasistencias se reinicia.  |
| Regla 6 | Cada barbero cobra el 60% del precio total de cada turno completado (el 40% restante corresponde al local), calculado sobre el precio vigente al momento de la reserva.  |
| Regla 7 | Si el administrador cancela un turno (ej.: emergencia del barbero), se notifica al cliente explicando el motivo y se emite automáticamente un vale de 20% de descuento, con fecha de caducidad según la configuración del administrador.  |
| Regla 8 | Al completar su 10° turno (y cada 10 turnos sucesivos: 20°, 30°, etc.), el cliente recibe automáticamente un vale de fidelidad del 30% de descuento.  |
| Regla 9 | Enviar un recordatorio automático (email \+ notificación in-app) 24 horas antes del horario del turno.  |
| Regla 10 | No permitir reservar turnos en días feriados/no laborables, ni fuera de la jornada laboral configurada para cada barbero.  |
| Regla 11 | El administrador puede activar o desactivar ofertas/combos de servicios con % de descuento, aplicados automáticamente al precio del turno.  |

## 3.2. Casos de estudio

* Cliente 1:  
  * Condición: Reserva un turno de "Corte \+ Barba" con el Barbero A el 10/09 a las 15:00hs. El Barbero A está libre en esa franja.  
  * Mensajes a enviar: Msj0 (Regla 0), Msj9 (Regla 9, recordatorio 24hs antes).  
* Cliente 2:  
  * Condición: Intenta reservar con el Barbero B a las 10:00hs, pero el Barbero B ya tiene un turno de 9:45 a 10:15hs.  
  * Mensajes a enviar: Msj\_Error (Regla 1\) \+ sugerencia de próximo horario disponible.  
* Cliente 3:  
  * Condición: Cliente con 3 inasistencias en los últimos 2 meses reserva un nuevo turno.  
  * Mensajes a enviar: Msj0, Msj\_Recargo (Regla 5, \+20% en esta reserva), Msj9.  
* Cliente 4:  
  * Condición: Cancela un turno con 20hs de anticipación (dentro de la ventana 4-24hs).  
  * Mensajes a enviar: Msj\_CancelacionConInasistencia (Regla 3: libera el horario, pero cuenta como inasistencia).  
* Cliente 5:  
  * Condición: El administrador cancela el turno del cliente porque el barbero asignado tuvo una emergencia.  
  * Mensajes a enviar: Msj\_CancelacionAdmin \+ Msj\_Vale, 20% de descuento (Regla 7).  
* Cliente 6:  
  * Condición: El cliente completa su 10° turno en el local.  
  * Mensajes a enviar: Msj\_Agradecimiento \+ Msj\_ValeFidelidad, 30% de descuento (Regla 8).

# 4\. Requerimientos funcionales

## 4.1. Historias de usuario

* ID: NAV-1  
  * Descripción: Como cliente, quiero reservar un turno seleccionando uno o varios servicios, barbero y horario disponible, para asegurar mi lugar en la agenda.  
  * Criterio de Aceptación: El sistema muestra únicamente horarios disponibles según el barbero y la duración total de los servicios elegidos, y confirma la reserva (Regla 0, Regla 1, Regla 2).  
* ID: NAV-2  
  * Descripción: Como cliente, quiero cancelar un turno, para avisar con anticipación si no puedo asistir.  
  * Criterio de Aceptación: El sistema aplica la Regla 3 según la anticipación de la cancelación (libera o no el horario, y registra o no una inasistencia).  
* ID: NAV-3  
  * Descripción: Como cliente, quiero ver mis próximos turnos y mi historial de turnos pasados, para organizarme y recordar qué me corté anteriormente.  
  * Criterio de Aceptación: El sistema muestra dos listados separados: turnos futuros confirmados, y turnos pasados con su estado final (completado/inasistencia/cancelado).  
* ID: NAV-4  
  * Descripción: Como cliente, quiero ver mis vales de descuento y mis penalizaciones vigentes, para saber qué beneficios o recargos tengo antes de reservar.  
  * Criterio de Aceptación: El sistema muestra los vales (origen, %, fecha de caducidad, estado) y, si corresponde, un aviso de recargo por inasistencias reiteradas.  
* ID: NAV-5  
  * Descripción: Como cliente, quiero calificar a un barbero con 1 a 5 estrellas luego de un turno completado, para dejar mi opinión del servicio recibido.  
  * Criterio de Aceptación: El sistema registra la calificación asociada al barbero y al turno, y actualiza el promedio del barbero.  
* ID: NAV-6  
  * Descripción: Como barbero, quiero ver mi agenda de turnos por día y horario, para saber a quién debo atender.  
  * Criterio de Aceptación: El barbero visualiza únicamente sus propios turnos, en modo de solo lectura.  
* ID: NAV-7  
  * Descripción: Como barbero, quiero ver cuánto me corresponde cobrar por día (60% de cada servicio completado), con un gráfico de barras que pueda alternar entre semana y mes.  
  * Criterio de Aceptación: El gráfico refleja únicamente los turnos completados, aplicando el 60% sobre el precio histórico de cada turno (Regla 6).  
* ID: NAV-8  
  * Descripción: Como administrador, quiero marcar un turno como completado o como inasistencia, para mantener actualizado el historial del cliente y del barbero.  
  * Criterio de Aceptación: El estado del turno se actualiza; si es inasistencia, se contabiliza para la Regla 5\.  
* ID: NAV-9  
  * Descripción: Como administrador, quiero cancelar un turno en casos excepcionales, para avisar al cliente y compensarlo con un vale.  
  * Criterio de Aceptación: Al cancelar, se notifica al cliente el motivo y se emite automáticamente un vale de 20% de descuento (Regla 7).  
* ID: NAV-10  
  * Descripción: Como administrador, quiero configurar los horarios laborales, días libres y feriados de cada barbero, para que el sistema calcule correctamente la disponibilidad.  
  * Criterio de Aceptación: Los turnos no pueden reservarse fuera de la jornada configurada ni en días feriados/no laborables (Regla 10).  
* ID: NAV-11  
  * Descripción: Como administrador, quiero configurar la duración de los vales de fidelidad y de cancelación, para definir cuánto tiempo son válidos.  
  * Criterio de Aceptación: Cada vez que se emite un vale, su fecha de caducidad se calcula según la duración configurada vigente al momento de la emisión.  
* ID: NAV-12  
  * Descripción: Como administrador, quiero activar o desactivar ofertas/combos de servicios con un % de descuento, para promocionar combinaciones específicas.  
  * Criterio de Aceptación: Al reservar una combinación de servicios con una oferta activa, el precio del turno refleja el descuento correspondiente (Regla 11).  
* ID: NAV-13  
  * Descripción: Como administrador, quiero ver reportes de inasistencias, ingresos, servicios/horarios/barberos más solicitados y calificación promedio, para tomar decisiones sobre el negocio.  
  * Criterio de Aceptación: Los reportes son filtrables por rango de fechas y reflejan datos actualizados.  
* ID: NAV-14  
  * Descripción: Como administrador, quiero ver cuánto le corresponde cobrar a cada barbero por día, para gestionar los pagos/liquidaciones.  
  * Criterio de Aceptación: El sistema muestra, para cada barbero, el monto total (60% de sus turnos completados) del día seleccionado.

## 4.2. Criterios de bondad

* DISPONIBILIDAD DE BARBERO: franjas horarias libres de un barbero, calculadas en función de su jornada laboral configurada, sus días libres/feriados y los turnos ya asignados (Regla 1, Regla 10).  
* HISTORIAL DE CLIENTE: turnos previos del cliente (servicios, barberos, estado), usado para calcular inasistencias recientes (Regla 5\) y turnos completados acumulados (Regla 8).  
* PRECIO HISTÓRICO DEL TURNO: precio de él/los servicio(s) vigente al momento de la reserva, usado para calcular la comisión del barbero (Regla 6), sin verse afectado por cambios de precio posteriores.  
* Generar Vale: calcular fecha de emisión y caducidad de un vale en base a la duración configurada por el administrador para su tipo (fidelidad o cancelación).

# 5\. Pantallas de usuario

* Pantalla NAV001: Landing — presentación de la barbería, con acceso a "Reservar turno" (redirige a /login).  
* Pantalla NAV002: Login (/login) — acceso único para cliente, barbero y administrador.  
* Pantalla NAV003: Registro de Cliente (/signup).  
* Pantalla NAV004: Reserva de Turno — selección de uno o varios servicios, barbero y horario disponible.  
* Pantalla NAV005: Próximos Turnos e Historial (Cliente).  
* Pantalla NAV006: Vales y Penalizaciones (Cliente).  
* Pantalla NAV007: Agenda e Ingresos (Barbero), con gráfico semana/mes.  
* Pantalla NAV008: Agenda General y Gestión de Turnos (Admin).  
* Pantalla NAV009: Configuración de Barberos, Horarios y Feriados (Admin).  
* Pantalla NAV010: Configuración de Vales y Ofertas/Combos (Admin).  
* Pantalla NAV011: Reportes y Liquidaciones (Admin).

# 6\. Glosario

| Término | Descripción |
| :---- | :---- |
| Criterio de aceptación | Condiciones que un producto de software debe satisfacer para ser aceptado por un usuario, cliente o stakeholder.  |
| Inasistencia | Ausencia del cliente a un turno reservado, ya sea por no presentarse o por cancelar fuera del plazo sin penalización.  |
| Vale | Beneficio de descuento porcentual, con fecha de emisión y caducidad, otorgado por fidelidad o por cancelación del administrador.  |
| Precio histórico | Precio de un servicio registrado en el momento exacto de la reserva de un turno, independiente de cambios de precio posteriores.  |

