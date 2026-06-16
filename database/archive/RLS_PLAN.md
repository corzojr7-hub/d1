# RLS_PLAN - Sistema de Control Operativo de Tienda

## 1. Proposito

Este documento define el plan documental de seguridad y acceso a datos para Supabase en el MVP.

No contiene instrucciones ejecutables, no crea politicas, no habilita RLS y no aplica cambios en Supabase real. Su objetivo es dejar clara la matriz de permisos antes de una tarea posterior de implementacion tecnica.

El MVP sigue limitado a:

- Registro de Instrucciones Operativas.
- Registro de Merma.

Quedan fuera del MVP: asistentes, roles nuevos, multi-tienda, auditoria historica avanzada, inventario oficial, integraciones corporativas, firma digital, nomina, dashboards avanzados e IA predictiva.

## 2. Alcance de seguridad del MVP

Tablas cubiertas:

- `profiles`.
- `products`.
- `instructions`.
- `waste_records`.

Tablas o estructuras no cubiertas en esta tarea:

- Storage policies de detalle para bucket de evidencia.
- Historial avanzado de cambios.
- Administracion multi-tienda.
- Integraciones externas.
- Seeds, migraciones o configuracion local de Supabase.

## 3. Principios de seguridad

- Solo usuarios autenticados pueden usar la aplicacion.
- Solo usuarios con perfil activo en `profiles` pueden leer o modificar datos del MVP.
- Los asistentes no usan la aplicacion en el MVP y no deben tener rol ni perfil habilitado.
- No se agregan roles fuera de `supervisor`, `segundo_al_mando` y `tercero_al_mando`.
- La aplicacion no debe exponer datos a visitantes anonimos ni usuarios autenticados sin perfil activo.
- Los perfiles con registros historicos deben inactivarse antes que eliminarse.
- Los registros operativos no deben eliminarse fisicamente desde la aplicacion; deben cerrarse o anularse segun permisos.
- La trazabilidad minima se conserva con `created_by`, `updated_by`, `created_at` y `updated_at`.
- El frontend puede ocultar acciones por rol, pero la regla real debe vivir en la capa de datos cuando se implementen politicas.
- Los permisos deben ser suficientemente simples para no bloquear la operacion diaria de tienda.

## 4. Roles del MVP

### supervisor

Rol principal de control, validacion y cierre operativo.

### segundo_al_mando

Rol operativo delegado. Puede registrar y actualizar eventos operativos no criticos. En el MVP no puede anular ni cerrar estados criticos porque no se modela tecnicamente la encargatura.

### tercero_al_mando

Rol de apoyo. Puede registrar y hacer seguimiento basico, pero no debe cerrar decisiones criticas ni anular registros.

## 5. Matriz de permisos por rol

| Accion funcional | supervisor | segundo_al_mando | tercero_al_mando |
| --- | --- | --- | --- |
| Iniciar sesion si tiene perfil activo | Si | Si | Si |
| Consultar instrucciones | Si | Si | Si |
| Crear instrucciones | Si | Si | Si |
| Actualizar instrucciones activas | Si | Si | Si |
| Anular instrucciones | Si | No | No |
| Consultar registros de merma | Si | Si | Si |
| Crear registros de merma | Si | Si | Si |
| Actualizar registros de merma en seguimiento | Si | Si | Si, solo campos no criticos |
| Cambiar merma a revisado | Si | No | No |
| Cambiar merma a recuperable | Si | No | No |
| Cambiar merma a no_recuperable | Si | No | No |
| Cambiar merma a requiere_seguimiento | Si | Si | Si |
| Anular registros de merma | Si | No | No |
| Consultar productos internos activos | Si | Si | Si |
| Crear o editar productos internos | Si | Si, si se delega carga operativa | No |
| Inactivar productos internos | Si | No | No |
| Consultar perfiles activos basicos | Si | Si | Si |
| Crear, cambiar rol o inactivar perfiles | Fuera del flujo normal de la app MVP | Fuera del flujo normal de la app MVP | No |

Nota sobre encargatura: por DEC-012, el MVP no modelara tecnicamente la encargatura del segundo al mando. Mientras no exista una regla verificable de turno o delegacion, las acciones criticas quedan reservadas a `supervisor`.

## 6. Reglas por tabla

### profiles

Lectura:

- Usuarios autenticados con perfil activo pueden leer informacion basica de perfiles activos necesaria para seleccionar responsables, mostrar nombres y resolver permisos.
- No se debe exponer informacion sensible innecesaria.
- Usuarios sin perfil activo no deben leer perfiles.

Creacion:

- La creacion de perfiles no debe ser una funcion abierta de la aplicacion MVP.
- Los perfiles iniciales se gestionan manualmente por administracion tecnica o proceso controlado.

Actualizacion:

- Un usuario comun no debe cambiar su propio rol ni estado.
- Cambios de rol, correo, estado o vinculacion con Auth quedan fuera del flujo normal del MVP.
- La inactivacion de perfiles se prefiere sobre eliminacion fisica.

Anulacion o eliminacion:

- No aplica anulacion.
- No se recomienda eliminar perfiles con trazabilidad historica.

### products

Lectura:

- Los tres roles activos pueden leer productos activos para busqueda por codigo de barras.
- Los productos inactivos no deben aparecer como opcion normal de captura, salvo consulta tecnica o historica.

Creacion:

- `supervisor` puede crear productos internos si se habilita carga manual.
- `segundo_al_mando` no crea productos internos desde la app en el MVP.
- `tercero_al_mando` no crea productos internos en el MVP.

Actualizacion:

- `supervisor` puede actualizar nombre, categoria, unidad sugerida, nota de fuente y estado.
- `segundo_al_mando` no edita productos internos desde la app en el MVP.
- `tercero_al_mando` no edita productos.

Anulacion o inactivacion:

- No se eliminan productos desde el flujo normal.
- `supervisor` puede inactivar productos internos.
- La inactivacion evita uso nuevo sin romper registros historicos.

### instructions

Lectura:

- Los tres roles activos pueden consultar instrucciones e historial basico.
- Usuarios sin perfil activo no pueden leer instrucciones.

Creacion:

- Los tres roles activos pueden crear instrucciones.
- El sistema debe asignar el usuario creador desde el perfil autenticado.
- El estado inicial recomendado es `pendiente`.

Actualizacion:

- Los tres roles activos pueden actualizar observaciones y estados operativos no finales.
- `supervisor` puede actualizar cualquier estado permitido.
- `segundo_al_mando` puede actualizar estados operativos no criticos.
- `tercero_al_mando` puede mover instrucciones a `en_proceso`, `cumplida`, `no_cumplida` o `requiere_seguimiento`, pero no a `anulada`.

Anulacion:

- `supervisor` puede anular instrucciones.
- `segundo_al_mando` no puede anular instrucciones en el MVP porque la encargatura no se modela tecnicamente.
- `tercero_al_mando` no puede anular instrucciones.
- No se deben eliminar instrucciones desde la aplicacion.

### waste_records

Lectura:

- Los tres roles activos pueden consultar registros de merma e historial basico.
- Usuarios sin perfil activo no pueden leer registros de merma.

Creacion:

- Los tres roles activos pueden crear registros de merma.
- El sistema debe asignar el usuario creador desde el perfil autenticado.
- El estado inicial recomendado es `pendiente_revision`.
- El producto no encontrado debe permitirse y guardarse con el codigo capturado.

Actualizacion:

- `supervisor` puede actualizar campos operativos y estado de revision.
- `segundo_al_mando` puede actualizar campos operativos y estados no criticos.
- `tercero_al_mando` puede corregir observacion, area o seguimiento basico, y puede marcar `requiere_seguimiento`.
- `tercero_al_mando` no puede cerrar revision como `revisado`, `recuperable` o `no_recuperable`.

Estados criticos de merma:

- Estados criticos: `revisado`, `recuperable`, `no_recuperable` y `anulado`.
- `supervisor` puede aplicar estados criticos.
- `segundo_al_mando` no puede aplicar estados criticos en el MVP porque la encargatura no se modela tecnicamente.
- `tercero_al_mando` no puede aplicar estados criticos.

Anulacion:

- `supervisor` puede anular registros de merma.
- `segundo_al_mando` no puede anular registros de merma en el MVP porque la encargatura no se modela tecnicamente.
- `tercero_al_mando` no puede anular registros de merma.
- No se deben eliminar registros de merma desde la aplicacion.

## 7. Resoluciones explicitas de seguridad

- El tercero al mando no puede anular instrucciones.
- El tercero al mando no puede anular registros de merma.
- El tercero al mando no puede cerrar revisiones criticas de merma.
- El tercero al mando si puede registrar merma, registrar instrucciones y marcar seguimiento operativo basico.
- El supervisor es el rol principal para anulaciones y cierres criticos.
- El segundo al mando puede actuar como delegado operativo para registro y seguimiento no critico, pero no para anulaciones ni cierres criticos en el MVP.
- Los asistentes quedan completamente fuera del MVP.
- No se agregan roles administrativos nuevos en esta fase.

## 8. Pendiente para SQL RLS

La futura tarea tecnica debe convertir este plan en reglas de base de datos. Las politicas futuras deben describirse e implementarse con cuidado, despues de una nueva revision.

Politicas futuras en lenguaje natural:

- Permitir acceso solo a usuarios autenticados.
- Bloquear cualquier acceso si el usuario autenticado no tiene perfil activo.
- Permitir lectura de perfiles activos a usuarios activos, limitada a datos necesarios para operacion.
- Impedir que usuarios normales cambien su propio rol o estado.
- Permitir lectura de productos activos a los tres roles.
- Restringir creacion y edicion de productos fuera del flujo normal de la app MVP; se manejaran por carga tecnica/manual controlada.
- Permitir lectura de instrucciones a los tres roles activos.
- Permitir creacion de instrucciones a los tres roles activos.
- Permitir actualizacion de instrucciones segun rol y estado destino.
- Restringir anulacion de instrucciones a supervisor.
- Permitir lectura de merma a los tres roles activos.
- Permitir creacion de merma a los tres roles activos.
- Permitir actualizacion de merma segun rol, estado destino y campos modificados.
- Restringir estados criticos de merma a supervisor.
- Bloquear anulacion de merma para tercero al mando.
- Bloquear eliminacion fisica desde perfiles de aplicacion para instrucciones y merma.

Pendientes de definicion antes de escribir reglas tecnicas:

- La encargatura del segundo al mando no se modelara en el MVP; acciones criticas quedan reservadas a supervisor.
- Los productos internos se manejaran por carga tecnica/manual controlada en el MVP, no desde la app.
- Confirmar si perfiles se administraran solo desde Supabase o tambien desde una pantalla futura.

## 9. Riesgos

Riesgos por permisos demasiado abiertos:

- Un tercero al mando podria anular registros o cerrar merma critica sin validacion del supervisor.
- Usuarios autenticados sin perfil activo podrian consultar datos operativos.
- Un usuario podria cambiar su propio rol o reactivarse indebidamente.
- Productos internos podrian editarse sin control, afectando busquedas por codigo de barras.
- Registros historicos podrian eliminarse y perder trazabilidad.

Riesgos por permisos demasiado restrictivos:

- El segundo al mando podria quedar bloqueado para cierres criticos durante una encargatura real.
- La tienda podria no registrar merma a tiempo si solo el supervisor puede hacer demasiadas acciones.
- La carga de productos internos podria depender de un proceso tecnico/manual y frenar la resolucion de codigos no encontrados.
- Reglas muy complejas podrian generar errores dificiles de diagnosticar en celular.

Mitigacion recomendada:

- Empezar con reglas simples y conservadoras.
- Priorizar lectura y creacion operativa para los tres roles activos.
- Reservar anulaciones y cierres criticos a supervisor durante el MVP.
- Inactivar antes que eliminar.
- Probar cada permiso por rol antes de habilitar uso real.

## 10. Criterios para avanzar a implementacion RLS

Se puede pasar a una tarea posterior de escritura de reglas tecnicas cuando:

- Este plan sea aprobado.
- Se mantenga DEC-012: sin encargatura tecnica y sin administracion de productos desde la app en el MVP.
- Se mantenga fuera del MVP a asistentes y roles nuevos.
- Se prepare una tarea separada que escriba reglas tecnicas verificables sin tocar frontend.
