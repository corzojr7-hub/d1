# Revision Tecnica de RLS y Policies - MVP-010

## 1. Alcance y Criterios de Revision

- **Archivo revisado:** `database/rls_policies.sql`
- **Referencias:** `database/RLS_PLAN.md`, `database/schema.sql`, `DECISIONS.md`, `PRD.md`, `ARCHITECTURE.md`
- **Modelo ejecutor:** Kimi K2.6 Free (QA tecnico de seguridad/RLS)
- **Restricciones:** No se modifica `rls_policies.sql` ni `schema.sql`. No se evalua frontend, migraciones, seeds, Storage policies ni aplicacion en Supabase real.

## 2. Resumen Ejecutivo

**No se detectaron hallazgos bloqueantes.** La propuesta RLS es sintacticamente valida, evita la recursion directa en `profiles_select_active`, respeta `DEC-012` (sin encargatura tecnica, acciones criticas reservadas a supervisor, productos bloqueados desde app), bloquea deletes en las 4 tablas, no agrega roles nuevos ni asistentes y no expone credenciales.

Sin embargo, existen 3 hallazgos de severidad **Importante**: riesgo de recursion RLS indirecta a traves de helpers `security definer`, posibilidad de suplantacion en campos `created_by`/`updated_by`, y una contradiccion documental entre la matriz de `RLS_PLAN.md` y `DEC-012`.

## 3. Evaluacion por Dimension

| Dimension | Estado | Comentario |
|-----------|--------|------------|
| Sintaxis general | Aprobado | SQL valido; politicas `restrictive`, `using`/`with check`, funciones `security definer` y `search_path` bien formados. |
| Recursion RLS | Riesgo detectado | Evitada recursion directa en `profiles_select_active`, pero persiste riesgo indirecto via helpers (IMP-001). |
| Helpers `security definer` | Riesgo detectado | Funciones consultan `public.profiles` internamente; dependen de que el dueño tenga BYPASSRLS (IMP-001). |
| DEC-012 (encargatura/productos) | Cumple | Acciones criticas solo para `supervisor`; productos inaccesibles desde app. Pero hay contradiccion con matriz del plan (IMP-003). |
| Deletes | Bloqueados correctamente | Politicas restrictivas `no_delete` en las 4 tablas. |
| Roles/asistentes | Cumple | Solo 3 roles aprobados; asistentes fuera del MVP. |
| Perfil activo | Cumple | `is_active_app_user()` bloquea a usuarios autenticados sin perfil activo. |
| Seeds/credenciales/migraciones | Cumple | No existen en el archivo revisado. |

## 4. Hallazgos por Severidad

### Bloqueante
Ninguno.

### Importante

#### IMP-001: Riesgo de recursion RLS indirecta a traves de helpers `security definer`
Las funciones `public.current_app_profile_id()`, `public.current_app_role()` y `public.is_active_app_user()` estan definidas como `security definer` y ejecutan `select ... from public.profiles`. Cuando una politica RLS sobre `profiles` invoca `is_active_app_user()`, si el dueño de la funcion no posee el privilegio `BYPASSRLS`, PostgreSQL reevaluara las politicas de `profiles` para esa consulta interna, generando recursion infinita o error.

En Supabase estandar el rol `postgres` posee `BYPASSRLS`, pero esto no esta garantizado en todos los entornos o si el propietario de la funcion difiere. MVP-009-CORR-002 mitigo la recursion directa en el SQL de la politica, pero no la recursion via funcion.

**Mitigacion recomendada:** Confirmar explicitamente que el dueño de las funciones tenga `BYPASSRLS` antes de aplicar. Alternativamente, cambiar a `security invoker` y asegurar que `profiles_select_active` permita a cada usuario leer su propio perfil (suficiente para que los helpers operen), eliminando la dependencia del dueño.

#### IMP-002: Suplantacion posible en `created_by` y `updated_by`
Las politicas `instructions_insert` y `waste_records_insert` verifican que el usuario este autenticado y tenga perfil activo, pero no validan que `created_by` sea igual al `id` del perfil del usuario autenticado. Un usuario activo podria insertar un registro atribuyendoselo a otro perfil. Lo mismo ocurre con `updated_by` en las politicas de UPDATE.

Esto compromete la trazabilidad operativa definida en `ARCHITECTURE.md` seccion 3 (Trazabilidad).

**Mitigacion recomendada:** Agregar `with check (created_by = public.current_app_profile_id())` en politicas de INSERT. Para UPDATE, agregar validacion equivalente para `updated_by`, bien via RLS (`with check`) o via trigger `BEFORE INSERT/UPDATE` que sobreescriba el campo con el perfil autenticado.

#### IMP-003: Contradiccion documental entre `RLS_PLAN.md` matriz y `DEC-012`
La matriz de permisos de `RLS_PLAN.md` seccion 5 indica que `segundo_al_mando` puede "anular instrucciones" y aplicar estados criticos de merma (`revisado`, `recuperable`, `no_recuperable`) "solo si esta encargado". Sin embargo, `DEC-012` prohobe explicitamente modelar la encargatura tecnica en el MVP, y el SQL implementa que solo `supervisor` puede realizar estas acciones.

El SQL esta alineado con `DEC-012`, pero el plan documental se contradice consigo mismo. Esto puede generar confusion en futuras tareas de implementacion frontend o en revisiones de alcance.

**Mitigacion recomendada:** Corregir `RLS_PLAN.md` seccion 5 para eliminar la columna "solo si esta encargado" de segundo_al_mando en acciones criticas, dejando "No" de forma explicita, coherente con `DEC-012`.

### Menor

#### MIN-001: Permisos de UPDATE demasiado amplios para `instructions` y `waste_records`
RLS a nivel de fila no puede restringir columnas especificas. Por tanto, `segundo_al_mando` y `tercero_al_mando` pueden modificar `instruction_text`, `priority`, `responsible_person`, `quantity`, `reason`, `area`, etc., siempre que no cambien el estado a uno critico. `RLS_PLAN.md` sugiere un control mas granular (ej. tercero solo observaciones y seguimiento basico).

Este comportamiento es una limitacion conocida de RLS y esta correctamente documentada en las notas del SQL. La aplicacion frontend debera compensarlo ocultando campos no editables segun rol.

#### MIN-002: Uso de `auth.role()` potencialmente deprecado
Todas las politicas usan `auth.role() = 'authenticated'`. En versiones recientes de Supabase, `auth.role()` puede considerarse legacy frente a verificaciones explicitas del JWT (ej. `auth.uid() IS NOT NULL`). Aunque funciona en la mayoria de entornos actuales, reduce la claridad y podria dejar de ser soportado.

#### MIN-003: Politica `profiles_select_active` expone datos de todos los perfiles activos
Cualquier usuario autenticado con perfil activo puede leer `display_name`, `email` y `role` de todos los perfiles activos. Dado que son pocos usuarios de tienda, esto es aceptable para el MVP, pero carece de restriccion adicional (ej. solo perfiles necesarios para seleccionar responsables).

### Observacion

#### OBS-001: Ausencia intencional de Storage policies
No se incluyen politicas para el bucket de evidencia fotografica. Esto es correcto segun el alcance y se documenta en `database/README.md`.

#### OBS-002: Estado inicial en INSERT no verificado por RLS
Las politicas de INSERT no verifican que `status` sea `pendiente` o que `review_status` sea `pendiente_revision`. Un usuario podria insertar un registro directamente en estado `cumplida` o `revisado`. El frontend controla esto, pero la base de datos no lo impone desde RLS.

#### OBS-003: `profiles_no_insert` bloquea incluso al supervisor
La creacion de perfiles desde la aplicacion esta completamente bloqueada, incluso para `supervisor`. Esto es correcto segun `DEC-012` y el plan, pero implica que la gestion de usuarios debe hacerse manualmente o por proceso externo.

#### OBS-004: `security definer` sin especificar dueño explicito
El SQL no establece `OWNER` ni `SET ROLE` para las funciones helper. En Supabase, por defecto se crean con el rol de conexion actual, lo cual generalmente es `postgres` (con BYPASSRLS), pero no es garantia en todos los contextos de despliegue.

#### OBS-005: `search_path` en helpers incluye `auth`
`set search_path = public, auth` es correcto para evitar ataques de hijacking de `search_path`. Requiere que el esquema `auth` exista, lo cual es estandar en Supabase.

#### OBS-006: `is_active_app_user()` consulta repetidamente `profiles`
Cada evaluacion de politica que usa este helper ejecuta una subconsulta a `profiles`. Para tablas grandes, esto podria impactar el rendimiento. Dado el volumen esperado en el MVP, es aceptable.

#### OBS-007: Indices existentes son suficientes para las politicas
`idx_profiles_user_id` sobre `profiles(user_id)` soporta eficientemente la condicion `p.user_id = auth.uid()` usada en los helpers. Los demas indices soportan los filtros de las politicas (`status`, `review_status`, etc.).

## 5. Recomendaciones para Futura Tarea de Correccion/Aplicacion

1. **Resolver recursion RLS (IMP-001):** Antes de aplicar en Supabase real, confirmar que el dueño de las funciones helper tenga `BYPASSRLS`, o refactorizar helpers a `security invoker` con una politica base que permita a cada usuario leer su propio perfil.
2. **Prevenir suplantacion (IMP-002):** Agregar validacion en politicas de INSERT/UPDATE para `created_by` y `updated_by`, o implementar triggers `BEFORE INSERT/UPDATE` que sobreescriban estos campos con el perfil autenticado.
3. **Corregir RLS_PLAN.md (IMP-003):** Alinear la matriz de permisos con `DEC-012`, eliminando ambiguedades de "encargado" para acciones criticas.
4. **Reemplazar `auth.role()` (MIN-002):** Considerar `auth.uid() IS NOT NULL` como verificacion mas explicita y compatible a largo plazo.
5. **Validar estado inicial en INSERT (OBS-002):** Agregar `with check` en politicas de insert para restringir `status` y `review_status` a sus valores iniciales permitidos.
6. **Documentar dueño de funciones (OBS-004):** Anotar en el README o en el script que las funciones deben aplicarse con un rol que tenga `BYPASSRLS`.
7. **No agregar** roles nuevos, asistentes, encargatura tecnica, Storage policies, seeds ni migraciones en la correccion del RLS; esos permanecen para sus tareas dedicadas.

## 6. Conclusion y Decision

**Recomendacion final: Aprobar la propuesta RLS para correccion.**

La propuesta `database/rls_policies.sql` cumple el alcance de seguridad aprobado en `RLS_PLAN.md` y respeta `DEC-012`. Los hallazgos son tecnicos y documentales; ninguno bloquea la estructura. No se requiere escalamiento a GPT-5.5 porque no hay decision arquitectonica nueva, conflicto de seguridad irresoluble ni exposicion de datos no controlada.

Se sugiere generar una tarea de correccion posterior para resolver IMP-001, IMP-002 y alinear `RLS_PLAN.md` antes de aplicar el SQL en un proyecto Supabase real.
