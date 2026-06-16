# Revision Tecnica del Esquema SQL - MVP-006

## 1. Alcance y Criterios de Revision

- **Archivo revisado:** `database/schema.sql`
- **Referencias:** `PRD.md`, `ARCHITECTURE.md`, `DECISIONS.md`
- **Modelo ejecutor:** Kimi K2.6 Free (QA tecnico)
- **Restricciones:** No se modifica `schema.sql`. No se evalua RLS, policies, seeds, Storage, migraciones ni codigo frontend.

## 2. Resumen Ejecutivo

**No se detectaron hallazgos bloqueantes.** El esquema propuesto cubre las 4 entidades aprobadas (`profiles`, `products`, `instructions`, `waste_records`), incluye los campos principales definidos en el PRD, respeta los estados y roles aprobados, soporta el flujo de producto encontrado/no encontrado, almacena la referencia de evidencia fotografica y mantiene fuera del alcance los elementos excluidos del MVP (asistentes, firma digital, inventario oficial, integraciones corporativas).

El esquema es apropiado para su fase pero requiere ajustes tecnicos menores antes de aplicarse en Supabase real.

## 3. Evaluacion por Entidad

| Entidad | Estado | Comentario |
|---------|--------|------------|
| `profiles` | Aprobado con observaciones | Cumple roles, estados, vinculo a `auth.users`. Faltan triggers de `updated_at`. |
| `products` | Aprobado con observaciones | Cumple campos de base interna. Faltan triggers de `updated_at`. |
| `instructions` | Aprobado con observaciones | Cumple campos del PRD y estados. Faltan triggers de `updated_at`. |
| `waste_records` | Aprobado con observaciones | Cumple campos del PRD, motivos, estados y flujo no encontrado. Faltan triggers de `updated_at` y constraint de integridad entre `product_id` y `product_not_found`. |

## 4. Hallazgos por Severidad

### Bloqueante
Ninguno.

### Importante

#### IMP-001: Falta de triggers para `updated_at`
Todas las tablas definen `updated_at timestamptz not null default now()`, pero no existe funcion ni trigger `BEFORE UPDATE` para refrescar el valor. Esto afecta la trazabilidad de "fecha y hora de ultima actualizacion" requerida por `ARCHITECTURE.md` seccion 3 (Trazabilidad) y seccion 4 (entidades).

#### IMP-002: Riesgo de inconsistencia entre `product_id` y `product_not_found`
`waste_records` permite combinaciones logicamente invalidas:
- `product_id IS NOT NULL` + `product_not_found = true`
- `product_id IS NULL` + `product_not_found = false`

Esto contradice el flujo definido en `PRD.md` seccion 5.1 y `ARCHITECTURE.md` seccion 8, donde el flag debe reflejar fielmente si el producto fue resuelto en la base interna.

#### IMP-003: Bloqueo al eliminar perfiles con registros de auditoria
Las FK `created_by` y `updated_by` en `instructions` y `waste_records` usan el comportamiento por defecto (`NO ACTION`). Como `profiles.user_id` tiene `ON DELETE CASCADE` desde `auth.users`, eliminar un usuario de Supabase Auth intentaria eliminar su perfil, pero fallaria si ese perfil tiene registros creados. Esto dificulta la gestion de usuarios y no esta documentado como restriccion intencional.

### Menor

#### MIN-001: `waste_records.observation` es nullable frente a PRD
`PRD.md` seccion 5 lista "Observacion" como campo requerido. El schema la define como `text` (nullable). Aunque el flujo basico indica que el usuario la completa, la falta de `NOT NULL` permite registros sin observacion, debilitando la alineacion estricta con el PRD.

#### MIN-002: `profiles.email` sin restriccion de unicidad
`ARCHITECTURE.md` sugiere "Correo o identificador de acceso". El campo `email` no tiene `UNIQUE`, por lo que podria duplicarse si la aplicacion no valida previamente.

#### MIN-003: `evidence_path` sin validacion de formato
Es un campo `text` libre. Para el MVP es aceptable, pero una validacion de patron (ej. ruta de bucket `merma/...`) reduciria errores de integracion futura con Supabase Storage.

### Observacion

#### OBS-001: Dependencia del esquema `auth.users`
La FK `profiles.user_id -> auth.users(id)` es correcta para Supabase, pero acopla el esquema a la plataforma. Requiere que el esquema `auth` exista al aplicar el SQL.

#### OBS-002: `product_name` y `category` pueden quedar huérfanos
Si un producto se elimina, `product_id` se anula (`ON DELETE SET NULL`), pero `product_name` y `category` conservan el snapshot. Esto es acceptable para auditoria, pero el campo `product_not_found` no se actualizara automaticamente a `true`.

#### OBS-003: Genero diferente en estado anulado
`instructions` usa `anulada` (femenino) y `waste_records` usa `anulado` (masculino). Es coherente con `PRD.md`, pero gramaticalmente inconsistente entre modulos. Sugerir normalizar a `anulado` si se busca uniformidad estricta.

#### OBS-004: Ausencia intencional documentada
`database/README.md` declara correctamente que faltan RLS, Storage, seeds y triggers. Esto alinea con el alcance de MVP-005 y no se considera defecto.

#### OBS-005: `waste_records.area` como texto libre
`ARCHITECTURE.md` sugiere "Area o cuadrante". Para el MVP el texto libre es correcto; una futura normalizacion a tabla `areas` podria escalar el alcance innecesariamente.

#### OBS-006: Ambiguedad en PRD sobre evidencia fotografica obligatoria
`PRD.md` seccion 5 lista "Foto de evidencia" como campo requerido, pero el flujo basico (paso 7) dice "foto si aplica". `ARCHITECTURE.md` seccion 9 dice "Foto de evidencia requerida si asi se mantiene el criterio operativo del MVP". El schema opta por nullable, lo cual es razonable dada la ambiguedad documental, pero debera resolverse antes de implementar validaciones de aplicacion.

#### OBS-007: Posibilidad de vincular merma a producto inactivo
No existe restriccion que impida usar un `product_id` cuyo `status = 'inactivo'`. Esto podria ser manejado en aplicacion o RLS, pero el schema lo permite.

## 5. Recomendaciones para Futura Tarea de Correccion

1. **Triggers `updated_at`:** Crear funcion `update_updated_at_column()` y triggers `BEFORE UPDATE` en `profiles`, `products`, `instructions` y `waste_records`.
2. **Integridad `product_id` / `product_not_found`:** Agregar `CHECK` constraint en `waste_records` que garantice coherencia logica entre ambos campos.
3. **Comportamiento de auditoria ante eliminacion de perfiles:** Definir explicitamente `ON DELETE SET NULL` en `created_by` y `updated_by` de `instructions` y `waste_records`, o documentar formalmente que la eliminacion fisica de perfiles esta prohibida mientras existan registros.
4. **Resolver ambiguedad de campos requeridos:** Definir si `observation` y `evidence_path` seran obligatorios u opcionales, ajustando tanto el PRD como el schema en la tarea de correccion.
5. **Robustez de `profiles.email`:** Evaluar agregar restriccion `UNIQUE` si el correo es identificador de acceso.
6. **Validacion de `evidence_path`:** Considerar un `CHECK` de formato basico para rutas de bucket (ej. `evidence_path ~ '^[a-z0-9/._-]+$'`).
7. **Limites de alcance:** No agregar nuevas entidades, tablas de historial, RLS, seeds, Storage ni migraciones en la correccion del esquema; esos permanecen para sus tareas dedicadas.

## 6. Conclusion y Decision

**Recomendacion final: Aprobar el esquema para correccion.**

El esquema `database/schema.sql` cumple el alcance y la estructura aprobada en `ARCHITECTURE.md` y `PRD.md`. Los hallazgos son tecnicos, controlables y no comprometen la arquitectura global. No se requiere escalamiento a decision arquitectonica ni cambio de alcance.

Se sugiere generar una tarea de correccion posterior (ej. `MVP-006-CORR` o dentro de `MVP-007`) para aplicar los ajustes de severidad Importante y Menor antes de avanzar a RLS, policies o aplicacion en Supabase real.
