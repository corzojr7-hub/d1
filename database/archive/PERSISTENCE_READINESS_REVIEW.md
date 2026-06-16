# Revision de Preparacion para Persistencia - MVP-025 (corregido)

## 1. Alcance y Criterios

- **Objetivo:** Evaluar si la capa de dominio, UI, schema SQL, RLS y checklist estan alineados y listos para conectar formularios con Supabase real.
- **Archivos revisados:** PRD.md, ARCHITECTURE.md, DECISIONS.md, PROJECT_CONTEXT.md, ROADMAP.md, database/schema.sql, database/rls_policies.sql, database/README.md, database/SCHEMA_REVIEW.md, database/RLS_PLAN.md, database/RLS_REVIEW.md, database/APPLY_SUPABASE_CHECKLIST.md, src/lib/supabase/client.ts, src/lib/domain/types.ts, src/lib/domain/catalogs.ts, src/lib/domain/validators.ts, src/lib/domain/payloads.ts, src/lib/domain/submissions.ts, src/app/instructions/new/InstructionForm.tsx, src/app/waste/new/WasteForm.tsx, tests/domain/*.test.mjs, package.json.
- **Restricciones:** No se modifica codigo, SQL ni documentos existentes. No se crean migraciones, carpeta supabase/ ni .env.local.
- **Modelo ejecutor:** GLM 4.5 Air Free (correccion QA documental).

## 2. Resumen Ejecutivo

**No se detectaron hallazgos bloqueantes.** La capa de dominio (tipos, catalogos, validadores, payloads, submissions) esta solida, coherente con el schema SQL y respeta DEC-012. Los tests unitarios pasan (54/54). Lint y build pasan.

Sin embargo, existen **brechas importantes** que impiden conectar los formularios a Supabase real de forma segura y completa:

1. Los formularios UI no utilizan `submissions.ts`; validan localmente pero no preparan payloads ni validan `currentProfileId`.
2. No existe un service layer de Supabase que encapsule inserts con `submissions.ts`.
3. No existe autenticacion funcional ni obtencion real de `currentProfileId` desde Supabase Auth.
4. El privilegio `BYPASSRLS` del owner de los helpers `security definer` no ha sido confirmado en un proyecto Supabase real.

Por tanto, la recomendacion es **aprobar con correcciones previas** antes de la conexion de prueba en Supabase real.

## 3. Evaluacion por Dimension

### 3.1 Tipos de dominio vs Schema SQL

| Aspecto | Estado | Nota |
|---------|--------|------|
| `Instruction` / `WasteRecord` / `Product` / `Profile` | Listo | Campos, tipos y nullability alineados con tablas. |
| Estados y enums | Listo | `types.ts` coincide con constraints `check` de schema.sql y catalogos. |
| `product_id` + `product_not_found` | Listo | Representado como `string \| null` y `boolean`, coherente con constraint SQL. |
| `evidence_path` | Listo | `string \| null` en tipos; `text` nullable en schema. |
| `observation` en merma | Listo | `string` requerido en tipos y `not null` en schema (DEC-011). |

### 3.2 Catalogos vs Constraints SQL

| Aspecto | Estado | Nota |
|---------|--------|------|
| `INSTRUCTION_PRIORITIES` | Listo | 4 valores; coinciden con constraint SQL. |
| `INSTRUCTION_STATUSES` | Listo | 6 valores; coinciden con constraint SQL. |
| `WASTE_REASONS` | Listo | 10 valores; coinciden con constraint SQL. |
| `WASTE_REVIEW_STATUSES` | Listo | 6 valores; coinciden con constraint SQL. |
| `PROFILE_ROLES` | Listo | 3 roles; sin asistentes (DEC-003, DEC-012). |

### 3.3 Validadores vs Schema y UI

| Aspecto | Estado | Nota |
|---------|--------|------|
| Obligatoriedad de campos | Listo | `responsible_person`, `instruction_text`, `barcode`, `quantity`, `unit`, `reason`, `area`, `observation` validados. |
| `quantity > 0` | Listo | `isPositiveNumber` rechaza 0, negativos y no-numericos. |
| UUID de `product_id` | Listo | `isUuid` valida formato estandar. |
| Coherencia `product_id`/`product_not_found` | Listo | Validador de dominio replica `chk_product_not_found_coherence`. |
| Estado opcional en input | Listo | `status`/`review_status` opcionales en validador; payloads los fuerzan despues. |
| Longitud maxima de textos | Menor | No se validan limites de longitud (schema usa `text` sin limite). |

### 3.4 Payloads vs Schema

| Aspecto | Estado | Nota |
|---------|--------|------|
| Estado inicial forzado | Listo | `status: "pendiente"` y `review_status: "pendiente_revision"` hardcodeados. |
| `created_by` incluido | Listo | Recibe `currentProfileId` desde submission. |
| Campos auto-generados excluidos | Listo | `id`, `created_at`, `updated_at`, `updated_by` omitidos de insert payload. |
| `observations` vacias -> null | Listo | Constructor convierte `""` a `null`. |
| `evidence_path` -> null por defecto | Listo | Alineado con schema nullable. |

### 3.5 Submissions vs UI y Supabase

| Aspecto | Estado | Nota |
|---------|--------|------|
| Union de validacion input + profileId | Listo | `prepare*Submission` valida datos y UUID de perfil. |
| Acumulacion de issues | Listo | Retorna todas las issues juntas. |
| No produce payload si falla | Listo | `payload: null` cuando `ok: false`. |
| Uso desde UI | No listo | Forms no invocan `prepare*Submission`; usan validadores directamente. |

### 3.6 UI Forms

| Aspecto | Estado | Nota |
|---------|--------|------|
| `InstructionForm` campos requeridos | Listo | Responsable, texto, prioridad capturados. |
| `WasteForm` campos requeridos | Listo | Barcode, cantidad, unidad, motivo, responsable, area, observacion capturados. |
| Flujo producto no encontrado | Listo | Checkbox alterna `product_not_found` y limpia `product_id`. |
| Estado inicial mostrado como estatico | Listo con condicion | En instruction se muestra "Pendiente"; en waste "Pendiente de revision". Aunque el form data incluye el campo, el usuario no puede cambiarlo facilmente. |
| `quantity` string -> Number() | Listo con condicion | `Number("")` = 0 (rechazado); `Number("abc")` = NaN (rechazado por `isPositiveNumber`). Aceptable. |
| Evidencia fotografica | No listo | Bloque de placeholder indica "pendiente de implementar". |
| Integracion con submissions.ts | No listo | Falta puente entre form y dominio. |

### 3.7 Cliente Supabase y Entorno

| Aspecto | Estado | Nota |
|---------|--------|------|
| Helper minimo creado | Listo | `src/lib/supabase/client.ts` exporta cliente con env vars. |
| Variables de entorno | Listo con condicion | `.env.example` existe (MVP-004); `.env.local` no existe aun (esperado). |
| Manejo de errores / retry | Menor | Cliente es instancia basica sin interceptores. |

### 3.8 Schema SQL y RLS

| Aspecto | Estado | Nota |
|---------|--------|------|
| Triggers `updated_at` | Listo | `set_updated_at()` + 4 triggers. |
| Constraint `chk_product_not_found_coherence` | Listo | Protege integridad logica. |
| `profiles.email` unique | Listo | Agregado en MVP-007. |
| `waste_records.observation` not null | Listo | Alineado con DEC-011. |
| Indices basicos | Listo | Cubren filtros y FKs. |
| RLS propuesta | Listo | Policies sintacticamente correctas; validan autoria (`created_by`/`updated_by`) y estado inicial en INSERT. |
| `created_by`/`updated_by` en RLS | Listo | `instructions_insert`, `waste_records_insert`, `instructions_update`, `waste_records_update` exigen coincidencia con `current_app_profile_id()`. |
| Estado inicial en INSERT por RLS | Listo | `instructions_insert` exige `status = 'pendiente'`; `waste_records_insert` exige `review_status = 'pendiente_revision'`. |
| Deletes bloqueados | Listo | `no_delete` restrictive en las 4 tablas. |
| DEC-012 (encargatura/productos) | Listo | Acciones criticas solo supervisor; productos bloqueados desde app. |
| BYPASSRLS confirmado | No listo | Requiere verificacion manual en Supabase real antes de aplicar helpers `security definer`. |

### 3.9 Tests

| Aspecto | Estado | Nota |
|---------|--------|------|
| Validators | Listo | 27 tests; cubren validos, invalidos, edge cases. |
| Payloads | Listo | 13 tests; cubren forzado de estados, nulls, campos excluidos. |
| Submissions | Listo | 14 tests; cubren ok/fail, acumulacion, UUID de perfil. |
| Total | Listo | 54/54 pasan. |
| UI / integracion | No listo | Sin tests de componentes ni e2e. |

### 3.10 Checklist de Aplicacion

| Aspecto | Estado | Nota |
|---------|--------|------|
| Orden de pasos | Listo | Secuencia logica: proyecto -> auth -> schema -> RLS -> perfiles -> env. |
| Precondiciones | Listo | Checklist de 11 items antes de tocar Supabase. |
| Verificaciones por rol | Listo | Matriz de pruebas para supervisor, segundo, tercero, sin perfil. |
| Riesgos documentados | Listo | Recursion, credenciales, propietario de funciones, eliminacion fisica. |

## 4. Hallazgos por Severidad

### Bloqueante
Ninguno. Ningun hallazgo impide la conexion conceptual ni rompe la arquitectura aprobada.

### Importante

#### IMP-001: UI forms no utilizan `submissions.ts` ni validan `currentProfileId`
- **Archivo/linea:** `src/app/instructions/new/InstructionForm.tsx` (linea 49), `src/app/waste/new/WasteForm.tsx` (linea 63).
- **Descripcion:** Ambos formularios llaman directamente a `validateInstructionInput` / `validateWasteRecordInput`. No usan `prepareInstructionSubmission` / `prepareWasteRecordSubmission`. Por tanto, no validan que el `currentProfileId` sea un UUID valido, ni fuerzan la estructura final del payload de insercion.
- **Impacto:** Al conectar con Supabase, si el form construye el payload directamente (o si un service layer lo hace sin usar submissions), se pueden enviar datos con `created_by` ausente, invalido o inconsistente, o con estados iniciales manipulados.
- **Recomendacion:** Refactorizar `handleSubmit` de ambos formularios para invocar `prepare*Submission`, o documentar explicitamente que el service layer de Supabase debe usar `prepare*Submission` obligatoriamente y nunca construir payloads a mano.

#### IMP-002: No existe service layer de Supabase para inserts
- **Archivo/linea:** Inexistente (esperado `src/lib/services/instructions.ts` o similar).
- **Descripcion:** No hay un modulo que combine `supabase` client + `prepare*Submission` para ejecutar `.insert()`. La conexion de formularios a Supabase requiere este puente.
- **Impacto:** Bloquea cualquier prueba de insercion real; riesgo de que cada formulario implemente su propia logica de insert duplicada y desalineada.
- **Recomendacion:** Crear service layer antes de conectar formularios: funciones `insertInstruction` y `insertWasteRecord` que reciban datos crudos + `currentProfileId`, invoquen `prepare*Submission` y, si `ok`, ejecuten `supabase.from(...).insert(payload)`.

#### IMP-003: Autenticacion funcional no implementada; `currentProfileId` no proviene de Supabase Auth
- **Archivo/linea:** App en general.
- **Descripcion:** No existe login, session provider ni obtencion real de `currentProfileId` desde Supabase Auth. Los formularios no pueden obtener el profileId del usuario autenticado.
- **Impacto:** Bloquea cualquier insert real; `currentProfileId` debe proveerse manualmente o mediante mock hasta que se implemente auth.
- **Recomendacion:** Implementar autenticacion funcional (login + obtencion de perfil desde Supabase Auth) antes de conectar persistencia real, o documentar mecanismo de prueba con mock controlado.

#### IMP-004: BYPASSRLS no confirmado para helpers `security definer`
- **Archivo/linea:** `database/rls_policies.sql` funciones helper (`current_app_profile_id`, `current_app_role`, `is_active_app_user`).
- **Descripcion:** Las funciones helper usan `security definer` y consultan `public.profiles` internamente. Si el owner de estas funciones no tiene el privilegio `BYPASSRLS`, las policies que las invocan pueden generar recursion RLS indirecta.
- **Impacto:** Al aplicar en Supabase real, si el owner (por ejemplo, un rol diferente a `postgres`) no tiene `BYPASSRLS`, las policies fallaran.
- **Recomendacion:** Confirmar `BYPASSRLS` del owner antes de aplicar `rls_policies.sql` en proyecto de prueba. Documentar verificacion en checklist.

### Menor

#### MIN-001: `InstructionForm` incluye `status` en `FormData` aunque la UI lo muestra como estatico
- **Archivo/linea:** `src/app/instructions/new/InstructionForm.tsx` (lineas 23, 30).
- **Descripcion:** El form data tiene `status: "pendiente"`, pero no hay select; se muestra como texto estatico. Si un atacante manipula el estado antes del submit, el validador lo acepta si es catalogo valido, aunque payloads.ts lo corrija.
- **Impacto:** Confusion menor; el payload final es correcto gracias a `buildInstructionInsertPayload`.
- **Recomendacion:** Eliminar `status` de `FormData` y no enviarlo al validador, o mantenerlo oculto y no editable.

#### MIN-002: No hay preparacion de `updated_by` para futuras actualizaciones
- **Archivo/linea:** `src/lib/domain/payloads.ts`, `src/lib/domain/submissions.ts`.
- **Descripcion:** Los payloads y submissions solo cubren INSERT. No existe un `UpdatePayload` ni `prepareUpdateSubmission`.
- **Impacto:** Cuando se implemente edicion de estado, debera crearse desde cero; riesgo de inconsistencia.
- **Recomendacion:** Documentar en el service layer que las actualizaciones requeriran un builder similar, o crearlo proactivamente cuando se disene la tarea de UPDATE.

#### MIN-003: Cliente Supabase sin manejo de errores de red ni retry
- **Archivo/linea:** `src/lib/supabase/client.ts`.
- **Descripcion:** Exporta instancia base. No maneja desconexion, rate limits ni reintentos.
- **Impacto:** En red movil inestable, los inserts pueden fallar sin feedback claro.
- **Recomendacion:** Agregar wrapper de servicio que capture errores de red y muestre mensajes amigables (en tarea de service layer).

#### MIN-004: No hay tests de UI ni de integracion con Supabase
- **Archivo/linea:** Carpeta `tests/`.
- **Descripcion:** Solo hay tests unitarios de dominio. No hay tests de componentes ni e2e.
- **Impacto:** Regresiones en formularios no se detectaran automaticamente.
- **Recomendacion:** Considerar tests de componentes con React Testing Library en futura tarea de estabilizacion (Fase 7).

### Observacion

#### OBS-001: Storage y foto de evidencia no implementados
- **Archivo/linea:** `src/app/waste/new/WasteForm.tsx` (linea 298).
- **Descripcion:** Bloque de placeholder indica "pendiente de implementar". No hay bucket ni Storage policies.
- **Impacto:** Esperado para esta fase.

#### OBS-002: Escaneo de codigo de barras no implementado
- **Archivo/linea:** `src/app/waste/new/WasteForm.tsx` (linea 130).
- **Descripcion:** Nota "Escaneo pendiente de implementar". Entrada manual solamente.
- **Impacto:** Esperado para esta fase.

#### OBS-003: Autenticacion funcional no implementada
- **Archivo/linea:** App en general.
- **Descripcion:** No existe login, session provider ni obtencion real de `currentProfileId` desde Supabase Auth.
- **Impacto:** `currentProfileId` debe proveerse manualmente o mediante mock hasta que se implemente auth.

#### OBS-004: Warning de Node.js sobre `--experimental-loader` en tests
- **Archivo/linea:** `package.json` script `test`.
- **Descripcion:** Node sugiere usar `register()` en lugar de `--experimental-loader`. No afecta ejecucion actual.
- **Impacto:** Ninguno funcional.

#### OBS-005: No hay paginacion ni filtros en listados
- **Archivo/linea:** App en general.
- **Descripcion:** No se han implementado listados.
- **Impacto:** Fuera del alcance de la preparacion para persistencia; pertenece a Fase 4/5/6.

#### OBS-006: `waste_records` constraint protege coherencia independientemente de quien actualice
- **Archivo/linea:** `database/schema.sql` linea 125.
- **Descripcion:** `chk_product_not_found_coherence` refuerza la regla de dominio a nivel de base de datos.
- **Impacto:** Positivo; capa de datos como respaldo.

## 5. Matriz de Preparacion

| Dimension | Estado | Notas |
|-----------|--------|-------|
| Tipos de dominio vs schema SQL | Listo | Coherentes. |
| Catalogos vs constraints SQL | Listo | Coinciden. |
| Validadores vs schema y negocio | Listo | Cubren obligatoriedad, enums, UUID, coherencia. |
| Payloads vs schema SQL | Listo | Fuerzan estados iniciales, campos correctos. |
| Submissions (union validacion + perfil) | Listo | Validan input + UUID de perfil; no producen payload si fallan. |
| Tests unitarios de dominio | Listo | 54/54 pasan. |
| Lint y build del proyecto | Listo | Sin errores. |
| UI forms captura de datos | Listo con condicion | Capturan campos requeridos; faltan foto y escaneo. |
| Integracion UI -> submissions -> payload | No listo | Forms no usan submissions.ts. |
| Service layer Supabase (inserts) | No listo | No existe modulo de servicio. |
| Cliente Supabase / env vars | Listo con condicion | Helper minimo OK; .env.local requerido para prueba real. |
| Schema SQL aplicado en Supabase | No listo | Propuesta aprobada, no aplicada. |
| RLS aplicado en Supabase | No listo | Propuesta revisada, no aplicada. |
| BYPASSRLS confirmado para helpers | No listo | Documentado en checklist; requiere verificacion manual. |
| RLS validacion `created_by`/`updated_by` | Listo | Presente en policies insert/update de instructions y waste_records. |
| RLS validacion estado inicial en INSERT | Listo | Presente en policies insert de instructions y waste_records. |
| Storage / evidencia fotografica | No listo | Pendiente de implementacion. |
| Autenticacion funcional (login + perfil) | No listo | Pendiente; currentProfileId proviene de mock. |
| Listado y filtros | No listo | Fase 4/5/6. |
| Checklist de aplicacion manual | Listo | Documentado y completo. |

## 6. Orden Recomendado de Siguientes Tareas

1. **Crear proyecto Supabase de prueba y aplicar schema + RLS** siguiendo `database/APPLY_SUPABASE_CHECKLIST.md`, verificando explicitamente que el owner de las funciones helper tenga `BYPASSRLS`. No reimplementar RLS; usar `rls_policies.sql` actual.
2. **Implementar autenticacion funcional** (login + obtencion de `currentProfileId` real desde Supabase Auth / profiles). Esto desbloquea cualquier insert real.
3. **Crear service layer de Supabase** (`src/lib/services/instructions.ts`, `waste.ts`) que use `supabase` client + `prepare*Submission` para inserts. Este es el puente critico faltante entre dominio y persistencia.
4. **Conectar formularios UI al service layer** usando `prepare*Submission` en `handleSubmit`, o asegurar que el service layer invoque `prepare*Submission` internamente.
5. **Crear seeds de prueba** (usuarios Auth + perfiles + productos basicos) para validar inserts reales por rol.
6. **Configurar `.env.local`** con credenciales de proyecto de prueba y ejecutar inserts reales desde la app.
7. **Implementar listados basicos** de instrucciones y merma para verificar lectura con RLS activo.
8. **Implementar Storage y carga de foto** de evidencia (Fase 5).
9. **Implementar escaneo de codigo de barras** (Fase 5).

## 7. Conclusion y Recomendacion Final

**Recomendacion: Aprobar con correcciones previas.**

La preparacion para persistencia esta avanzada y la capa de dominio es solida. Las politicas RLS propuestas ya protegen la trazabilidad (`created_by`/`updated_by`) y los estados iniciales en INSERT. Sin embargo, **no se puede conectar a Supabase real de forma segura y completa todavia** porque faltan:

- Un proyecto Supabase de prueba con schema y RLS aplicados, y confirmacion de `BYPASSRLS`.
- Autenticacion funcional para obtener `currentProfileId` real.
- El service layer que una `supabase` con `submissions.ts`.
- La integracion de los formularios con ese service layer (o con `submissions.ts`).

Una vez resueltos los puntos 1-4 del orden recomendado, el proyecto estara listo para la conexion de prueba en Supabase real.

No se requiere escalamiento a GPT-5.5; los hallazgos son tecnicos, conocidos y no comprometen la arquitectura global ni introducen riesgos de seguridad irresolubles.
