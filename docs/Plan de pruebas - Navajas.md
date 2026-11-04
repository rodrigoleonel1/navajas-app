

# Documentación de Plan de Pruebas

Proyecto: Navajas (BarberApp)  
Versión: 1.1  
Fecha: 04/11/2026  
Autor: Rodrigo Alarcón

# 

# 1\. Alcance

| Versión | Fecha | Autor | Alcance |
| :---- | :---- | :---- | :---- |
| 1.0 | 14/10/2026 | Alarcón Rodrigo | MVP \- V1 |
| 1.1 | 04/11/2026 | Alarcón Rodrigo | MVP \- V1 \+ reglas clave V2/V3 |

# 2\. Objetivo

Verificar que el núcleo del MVP (V1) y las reglas de negocio críticas incorporadas en V2/V3 cumplen con lo prometido en el FRD del proyecto.

* Acceso por rol.  
* Gestión de servicios (admin).  
* Gestión de barberos y horarios (admin).  
* Reserva con disponibilidad (cliente).  
* Agenda por rol.  
* Cambio de estado de turnos (admin).  
* Reglas clave de V2/V3: vales, ofertas con vigencia, feriados y cancelaciones automáticas, penalizaciones por inasistencia, horizonte de reserva y grilla de 30 minutos.

# 3\. Ambiente de pruebas

| Punto | Detalle |
| :---- | :---- |
| Frontend local | [http\://localhost:5173](http://localhost:5173/) |
| Backend local | [http\://localhost:3000/api](http://localhost:3000/api) |
| Deploy | [https\://navajas.vercel.app](https://navajas.vercel.app) (la API se sirve en el mismo dominio, bajo `/api`) |
| Herramientas | Navegador y Postman como cliente API para probar endpoints |

# 4\. Criterio de aprobación

El alcance se considera probado cuando todos los casos de prueba estén en estado “OK” sobre el deploy de la aplicación, sin fallas bloqueantes. Las fallas menores quedan registradas en el documento para solucionar en versiones posteriores.

# 5\. Casos de prueba

Estados posibles: Pendiente / OK / Falla  
Los 36 casos se agrupan en 7 módulos:

| Módulo | Casos | Cantidad | Estado |
| :---- | :---- | :---- | :---- |
| Acceso por rol | CP-01 a CP-07 | 7 | OK |
| Servicios (admin) | CP-08 a CP-12 | 5 | OK |
| Barberos y horarios (admin) | CP-13 a CP-16 | 4 | OK |
| Reserva (cliente) | CP-17 a CP-20 | 4 | OK |
| Agenda por rol | CP-21 a CP-23 | 3 | OK |
| Estados del turno (admin) | CP-24 a CP-27 | 4 | OK |
| Reglas de negocio V2/V3 | CP-28 a CP-36 | 9 | OK |
| Total | CP-01 a CP-36 | 36 | OK |
