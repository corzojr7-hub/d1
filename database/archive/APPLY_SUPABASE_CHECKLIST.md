# APPLY_SUPABASE_CHECKLIST - Checklist de aplicacion manual en Supabase

> Tarea: MVP-012
> Fecha: 2026-06-03
> Estado: documental. No se ha ejecutado SQL en Supabase real.
> Archivos SQL involucrados: `database/schema.sql`, `database/rls_policies.sql`.

## 0. Aviso obligatorio

**No se debe aplicar nada en Supabase real sin una revision final por el equipo tecnico y la aprobacion del responsable del proyecto.**

Este checklist describe el orden recomendado, las precondiciones y las verificaciones posteriores para que, en una tarea futura y dedicada, un humano autorizado pueda aplicar manualmente los scripts `database/schema.sql` y `database/rls_policies.sql` en un proyecto Supabase del MVP. El alcance de MVP-012 es **unicamente documental**:

- No se ejecuta SQL.
- No se crea la carpeta `supabase/`.
- No se crean migraciones.
- No se crean archivos SQL nuevos.
- No se modifican `schema.sql` ni `rls_policies.sql`.
- No se implementa autenticacion, pantallas, seeds ni Storage policies.

Cualquier desviacion de este alcance queda fuera de MVP-012.

## 1. Alcance y referencias

- `database/schema.sql`: propuesta de tablas, constraints, triggers e indices.
- `database/rls_policies.sql`: propuesta de habilitacion de RLS, policies y funciones helper.
- `database/README.md`: estado de la propuesta y notas.
- `database/SCHEMA_REVIEW.md`: QA tecnico del esquema.
- `database/RLS_REVIEW.md`: QA tecnico de RLS/policies.
- `database/RLS_PLAN.md`: plan documental de seguridad, matriz de permisos y reglas por tabla.
- `DECISIONS.md`: marco de decisiones, en particular `DEC-010`, `DEC-011` y `DEC-012`.

Reglas vigentes que condicionan este checklist:

- `DEC-012`: no se modela encargatura tecnica del segundo al mando. Acciones criticas (`anulada` en instrucciones; `revisado`, `recuperable`, `no_recuperable`, `anulado` en merma) quedan reservadas al rol `supervisor`. La base `products` no se administra desde la app en el MVP inicial; la carga o ajuste de productos internos se hace por proceso tecnico o manual controlado.
- `DEC-011`: `observation` es obligatoria en merma. `evidence_path` sigue siendo condicional y nullable.
- Asistentes fuera del MVP. No se agregan roles nuevos.

## 2. Precondiciones (checklist previo a cualquier aplicacion)

Antes de tocar Supabase, se debe poder tildar cada item de esta lista:

- [ ] El proyecto esta en una cuenta Supabase dedicada al MVP. No se usan proyectos compartidos con otros sistemas.
- [ ] Se confirma que la region, plan y nivel de aislamiento del proyecto son los esperados para datos operativos de tienda.
- [ ] Se confirma que **no se cargaran datos reales sensibles** en este primer despliegue. Los datos iniciales seran de prueba o vacios.
- [ ] `DEC-012` sigue vigente y se respeta estrictamente: sin encargatura tecnica, sin administracion de productos desde la app, asistentes fuera del MVP.
- [ ] Se ha leido el contenido completo de `database/schema.sql` y `database/rls_policies.sql` linea por linea, sin aplicar nada todavia.
- [ ] Se ha leido `database/RLS_PLAN.md`, `database/SCHEMA_REVIEW.md` y `database/RLS_REVIEW.md`. Los hallazgos documentados estan entendidos y aceptados.
- [ ] Se ha confirmado que el rol que aplicara los scripts en Supabase es un rol con privilegios equivalentes a `postgres` (owner del proyecto) y que ese rol **posee el privilegio `BYPASSRLS`**. Esto es requerido por las funciones helper `security definer` definidas en `rls_policies.sql` (`current_app_profile_id`, `current_app_role`, `is_active_app_user`) para evitar recursion RLS indirecta al consultar `public.profiles`. En Supabase estandar el rol `postgres` cumple esto, pero se debe verificar explicitamente.
- [ ] No se han creado aun usuarios Auth con datos reales. Los usuarios Auth y los perfiles `profiles` se daran de alta **despues** de aplicar los scripts, en pasos controlados.
- [ ] No se han configurado `NEXT_PUBLIC_SUPABASE_URL` ni `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local` con valores productivos. Las credenciales se manejan al final, en un paso separado, fuera del repositorio.
- [ ] No hay credenciales, tokens, llaves o URLs reales en los archivos SQL ni en este checklist.

Si cualquiera de estos puntos no se cumple, **detenerse** y volver a revisar antes de continuar.

## 3. Orden recomendado de aplicacion manual

El orden esta pensado para que cada paso pueda verificarse antes de avanzar al siguiente. Si un paso falla, no se debe continuar con el siguiente.

### Paso 1. Crear o seleccionar el proyecto Supabase

- [ ] Crear un nuevo proyecto Supabase para el MVP o seleccionar el dedicado, si ya existe.
- [ ] Anotar la URL del proyecto y la `anon key` publica en un lugar seguro **fuera del repositorio** (gestor de secretos del equipo, no archivos planos). No se vuelcan a `.env.local` todavia.
- [ ] Verificar que el plan, region y configuracion de red del proyecto correspondan al alcance del MVP.

### Paso 2. Verificar el modulo Auth

- [ ] Confirmar que el modulo Auth esta habilitado en el proyecto.
- [ ] Confirmar que el esquema `auth` existe y que existe la tabla `auth.users` (es prerequisito del FK `profiles.user_id`).
- [ ] Decidir y dejar constancia de la politica de registro de usuarios: en este MVP los usuarios no se registran libremente; se daran de alta por administracion tecnica.
- [ ] Confirmar que **no** se ha habilitado "Auto Confirm Users" ni el registro publico por email/password sin control. La opcion recomendada es crear usuarios desde el dashboard o por invitacion controlada.
- [ ] No se crea ningun usuario todavia. Esto se hara en un paso posterior, despues de aplicar el esquema.

### Paso 3. Aplicar `database/schema.sql`

- [ ] Abrir el editor SQL de Supabase (Dashboard > SQL Editor) como owner del proyecto.
- [ ] Pegar el contenido completo de `database/schema.sql` y ejecutarlo como un solo bloque.
- [ ] Verificar que la ejecucion finaliza sin errores. Si hay errores, **detenerse**, revisar y no continuar.
- [ ] Verificar la presencia de las 4 tablas en `public`: `profiles`, `products`, `instructions`, `waste_records`.
- [ ] Verificar la presencia de la funcion `public.set_updated_at()`.
- [ ] Verificar la presencia de los 4 triggers `before update` (`trg_profiles_updated_at`, `trg_products_updated_at`, `trg_instructions_updated_at`, `trg_waste_records_updated_at`).
- [ ] Verificar la presencia de los indices basicos: `idx_profiles_user_id`, `idx_profiles_role`, `idx_products_barcode`, `idx_products_status`, `idx_instructions_status`, `idx_instructions_priority`, `idx_instructions_created_by`, `idx_instructions_created_at`, `idx_waste_records_status`, `idx_waste_records_reason`, `idx_waste_records_created_by`, `idx_waste_records_created_at`, `idx_waste_records_barcode`.
- [ ] Verificar el constraint `chk_product_not_found_coherence` en `waste_records`.
- [ ] Verificar que `profiles.email` tiene restriccion `UNIQUE`.
- [ ] Verificar que `waste_records.observation` es `NOT NULL`.
- [ ] Verificar que `evidence_path` sigue `nullable` (DEC-011).
- [ ] Verificar que RLS **no esta habilitada todavia** en ninguna de las 4 tablas. Esto es esperado: RLS se activa en el paso 5 con `rls_policies.sql`.

### Paso 4. Confirmar BYPASSRLS para los futuros helpers

- [ ] Antes de aplicar `rls_policies.sql`, confirmar que el rol owner de las funciones helper tendra `BYPASSRLS`. Esto evita recursion RLS indirecta al consultar `public.profiles` desde dentro de las funciones `security definer`.
- [ ] Si el entorno no garantiza `BYPASSRLS` para el owner, **detenerse** y resolver con administracion de Supabase antes de continuar. No aplicar el script en un entorno que pueda causar recursion.

### Paso 5. Aplicar `database/rls_policies.sql`

- [ ] Abrir el editor SQL de Supabase como owner del proyecto (mismo rol que en el paso 3).
- [ ] Pegar el contenido completo de `database/rls_policies.sql` y ejecutarlo como un solo bloque.
- [ ] Verificar que la ejecucion finaliza sin errores. Si hay errores, **detenerse**, revisar y no continuar.
- [ ] Verificar la presencia de las 3 funciones helper en `public`: `current_app_profile_id`, `current_app_role`, `is_active_app_user`.
- [ ] Verificar que las 4 tablas tienen RLS habilitada: `profiles`, `products`, `instructions`, `waste_records`.
- [ ] Verificar que existen las policies documentadas en el archivo: `profiles_select_active`, `profiles_no_insert`, `profiles_no_update`, `profiles_no_delete`, `products_select_active`, `products_no_insert`, `products_no_update`, `products_no_delete`, `instructions_select`, `instructions_insert`, `instructions_update`, `instructions_no_delete`, `waste_records_select`, `waste_records_insert`, `waste_records_update`, `waste_records_no_delete`.
- [ ] Verificar que las policies `no_insert`, `no_update`, `no_delete` y `no_delete` estan declaradas como `restrictive` segun el script.

### Paso 6. Crear usuarios Auth y perfiles `profiles`

- [ ] Confirmar que el flujo de alta de usuarios es controlado por administracion tecnica, no por auto-registro.
- [ ] Crear los usuarios Auth necesarios (uno por cada persona que usara la app) usando el dashboard o invitacion controlada.
- [ ] Para cada usuario Auth creado, insertar manualmente su fila en `public.profiles` con:
  - `user_id` = id de `auth.users`.
  - `display_name` no vacio.
  - `email` no vacio y unico.
  - `role` en {`supervisor`, `segundo_al_mando`, `tercero_al_mando`}.
  - `status` = `activo` por defecto.
- [ ] No crear perfiles para asistentes. Los asistentes quedan fuera del MVP (DEC-003, DEC-012).
- [ ] No usar la app para crear perfiles: la policy `profiles_no_insert` bloquea cualquier intento desde la aplicacion. Esta insercion se hace directamente en la base por administracion tecnica.
- [ ] No inactivar perfiles con registros historicos. Si en el futuro un usuario se desvincula, se cambia `status = 'inactivo'`, no se elimina fisicamente (preserva trazabilidad).
- [ ] No se crea ningun producto todavia. La carga de `products` se hara por proceso tecnico/manual controlado, no desde la app (DEC-012).

### Paso 7. Configurar variables de entorno fuera de git

- [ ] Verificar que `.env.local` esta listado en `.gitignore` y que **no** se commitea al repositorio.
- [ ] Crear `.env.local` en la raiz del proyecto (solo local) con:
  - `NEXT_PUBLIC_SUPABASE_URL` apuntando al proyecto Supabase del MVP.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la `anon` key publica del proyecto.
- [ ] Verificar que `.env.example` solo contiene placeholders, no valores reales.
- [ ] No incluir service role keys ni tokens administrativos en `.env.local` del proyecto de aplicacion. Si se requieren para tareas tecnicas, se manejan por canales separados.
- [ ] Verificar con `git status` y `git diff` que ningun archivo con credenciales fue agregado al repositorio.

## 4. Verificaciones posteriores por rol

Estas verificaciones asumen que el SQL ya esta aplicado y que existe al menos un usuario Auth con su perfil `profiles` en `status = 'activo'`. Se sugiere probarlas desde un cliente SQL autenticado con el JWT del usuario, o desde la app una vez integrada.

### 4.1 Usuario sin perfil activo (cuenta Auth sin fila en `profiles` o con `status = 'inactivo'`)

- [ ] `select` desde `public.profiles` no devuelve filas.
- [ ] `select` desde `public.products` no devuelve filas.
- [ ] `select` desde `public.instructions` no devuelve filas.
- [ ] `select` desde `public.waste_records` no devuelve filas.
- [ ] `insert` en cualquiera de las 4 tablas falla por la policy correspondiente.
- [ ] `update` en cualquiera de las 4 tablas falla.
- [ ] `delete` en cualquiera de las 4 tablas falla por la policy `no_delete`.

### 4.2 Rol `supervisor` con perfil activo

- [ ] Puede consultar (`select`) en `profiles`, `products`, `instructions` y `waste_records`.
- [ ] Puede insertar (`insert`) en `instructions` y `waste_records`, siempre con `created_by = current_app_profile_id()` y con el estado inicial permitido (`status = 'pendiente'`, `review_status = 'pendiente_revision'`).
- [ ] Puede actualizar (`update`) `instructions` y `waste_records` con `updated_by = current_app_profile_id()`.
- [ ] Puede mover una `instruction` a `anulada` y un `waste_record` a `revisado`, `recuperable`, `no_recuperable` o `anulado`. Esto valida que las acciones criticas estan reservadas a `supervisor` (DEC-012).
- [ ] No puede insertar, actualizar ni eliminar `profiles` ni `products` desde la app: las policies `no_insert`, `no_update` y `no_delete` lo bloquean. Esto es intencional y respeta DEC-012.

### 4.3 Rol `segundo_al_mando` con perfil activo

- [ ] Puede consultar las 4 tablas.
- [ ] Puede insertar en `instructions` y `waste_records` con su `created_by` correcto.
- [ ] Puede actualizar `instructions` y `waste_records` con su `updated_by` correcto.
- [ ] **No** puede mover una `instruction` a `anulada`. La policy `instructions_update` debe rechazarlo (DEC-012: sin encargatura tecnica, anulacion reservada a supervisor).
- [ ] **No** puede mover un `waste_record` a `revisado`, `recuperable`, `no_recuperable` ni `anulado`. Solo puede establecer `pendiente_revision` o `requiere_seguimiento`.
- [ ] No puede insertar, actualizar ni eliminar `profiles` ni `products`.

### 4.4 Rol `tercero_al_mando` con perfil activo

- [ ] Puede consultar las 4 tablas.
- [ ] Puede insertar en `instructions` y `waste_records` con su `created_by` correcto.
- [ ] Puede actualizar `instructions` y `waste_records` con su `updated_by` correcto, limitado a los estados no criticos permitidos.
- [ ] **No** puede anular instrucciones.
- [ ] **No** puede mover merma a `revisado`, `recuperable`, `no_recuperable` ni `anulado`. Solo puede usar `pendiente_revision` o `requiere_seguimiento`.
- [ ] No puede insertar, actualizar ni eliminar `profiles` ni `products`.
- [ ] Confirmar que, en la app, este rol **no ve** controles de anulacion ni de cierre critico. El frontend debe ocultar estas acciones aunque RLS ya las bloquee.

### 4.5 Verificacion cruzada de trazabilidad

- [ ] En una insercion exitosa de `instructions`, `created_by` coincide con el `id` del perfil del usuario autenticado. La policy `instructions_insert` lo exige.
- [ ] En una insercion exitosa de `waste_records`, `created_by` coincide con el `id` del perfil del usuario autenticado. La policy `waste_records_insert` lo exige.
- [ ] En una actualizacion exitosa, `updated_by` coincide con el `id` del perfil del usuario autenticado. Las policies `instructions_update` y `waste_records_update` lo exigen.
- [ ] `created_at` y `updated_at` se mantienen correctos: el trigger `before update` refresca `updated_at` automaticamente.
- [ ] `waste_records` mantiene la coherencia entre `product_id` y `product_not_found` via el constraint `chk_product_not_found_coherence`.

## 5. Riesgos y dudas conocidos

Lista no exhaustiva de los puntos que el equipo debe vigilar durante y despues de la aplicacion. Estos riesgos ya estan documentados en `RLS_REVIEW.md` y `SCHEMA_REVIEW.md`; aqui se reagrupan para el momento operativo.

- **Propietario incorrecto de las funciones helper.** Si el owner de `current_app_profile_id`, `current_app_role` e `is_active_app_user` no tiene `BYPASSRLS`, las policies que llaman a `is_active_app_user` pueden generar recursion RLS indirecta al consultar `public.profiles`. Mitigacion: confirmar `BYPASSRLS` del owner antes de aplicar y volver a verificarlo despues de aplicar.
- **Perfiles faltantes o con `status` incorrecto.** Un usuario Auth sin fila en `profiles`, o con `status = 'inactivo'`, no podra usar la app aunque su login sea valido. Si se olvida crear el perfil de un nuevo usuario, quedara bloqueado sin error claro. Mitigacion: alta de perfiles y Auth siempre en el mismo proceso tecnico.
- **Credenciales en el repositorio.** Si `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` se commitean a git por error, se expone el proyecto. Mitigacion: `.gitignore` correcto, revision de `git status` antes de cada commit, y rotacion de keys si ocurre.
- **Policies demasiado estrictas.** Si un permiso se cierra demasiado, el segundo al mando o el tercero al mando podrian quedar bloqueados en operaciones validas, forzando a pedir apoyo al supervisor. Mitigacion: empezar con permisos simples y observar el flujo real antes de endurecer.
- **Policies demasiado abiertas.** Si una policy permite mas de lo previsto (por ejemplo, no exigir `created_by = current_app_profile_id()`), un usuario podria atribuir registros a otro perfil. Mitigacion: validar las policies descritas en el paso 5 y las pruebas de la seccion 4.5 antes de habilitar uso real.
- **Inconsistencia entre plan y ejecucion.** `RLS_PLAN.md` ya fue alineado con `DEC-012`, pero cualquier futura modificacion del plan debe volver a validarse contra este checklist para no introducir regresiones.
- **Eliminacion fisica por error.** Las policies `no_delete` en las 4 tablas bloquean la eliminacion desde la app. Si un operador con acceso a SQL directo elimina filas, la trazabilidad se pierde. Mitigacion: limitar el acceso directo a la base al equipo tecnico necesario y operar siempre cambios de estado, no borrados.
- **Productos sin control.** Si en el futuro se habilita la administracion de `products` desde la app, hay que revisar este checklist y las policies `products_no_*` antes de hacerlo. Hoy estan intencionalmente bloqueadas (DEC-012).
- **Asistentes como usuarios.** Si por error se crea un usuario Auth con perfil para un asistente, la policy `profiles_select_active` no lo distingue: lo trataria como un usuario activo mas. Mitigacion: no crear perfiles de asistentes. La regla del MVP es que los asistentes no usan la app (DEC-003, DEC-012).
- **Cambios en Supabase que invaliden el modelo.** Si Supabase cambia el comportamiento de `auth.uid()`, de RLS o de `security definer`, las policies y los helpers pueden dejar de comportarse como se espera. Mitigacion: mantener este checklist y los scripts revisados ante cualquier actualizacion mayor de plataforma.

## 6. Procedimiento de rollback (documental, no se aplica aqui)

Si despues de la aplicacion se detecta un problema grave, este checklist no ejecuta un rollback: solo documenta la idea para que el equipo la evalue. Cualquier rollback debe ser una tarea nueva, aprobada y revisada.

Lineas generales a evaluar en una tarea de rollback:

- Revertir cambios en una ventana de mantenimiento.
- Deshabilitar RLS solo si las policies estan causando bloqueos legitimos, no para "abrir permisos" sin revision.
- No usar `delete` masivo sobre `instructions` o `waste_records` para "limpiar" datos: se rompe la trazabilidad.
- Mantener `profiles` con `status = 'inactivo'` en lugar de eliminar usuarios.
- Documentar la incidencia en `CHANGELOG.md` y en una nueva entrada de `DECISIONS.md` si la causa lo amerita.

## 7. Checklist final de cierre

Una vez completados los pasos 1 a 7 y las verificaciones de la seccion 4, se debe poder tildar:

- [ ] El esquema y las policies estan aplicadas sin errores en Supabase real.
- [ ] Las verificaciones por rol descritas en la seccion 4 fueron ejecutadas y superadas.
- [ ] `created_by` y `updated_by` quedan correctamente asignados al perfil autenticado.
- [ ] Ningun asistente tiene perfil creado.
- [ ] No hay productos administrados desde la app. La base `products` se carga por proceso tecnico/manual.
- [ ] `.env.local` existe localmente, esta fuera de git y solo contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] No se commiteo al repositorio ninguna credencial, URL productiva o key real.
- [ ] `CHANGELOG.md` registra la aplicacion efectiva y, si corresponde, `DECISIONS.md` documenta cualquier decision tomada durante el despliegue.

Cuando todos los puntos esten tildados, la aplicacion manual de `database/schema.sql` y `database/rls_policies.sql` en Supabase real puede darse por completada para el MVP.
