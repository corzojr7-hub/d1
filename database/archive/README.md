# Base de datos - Propuesta de esquema inicial

Este directorio contiene la propuesta SQL inicial para el esquema de Supabase del MVP.

## Archivos

- `schema.sql`: definicion completa de tablas, constraints, triggers e indices.
- `rls_policies.sql`: propuesta de RLS y policies por tabla (no aplicada en Supabase real).
- `APPLY_SUPABASE_CHECKLIST.md`: checklist documental para la aplicacion manual futura de `schema.sql` y `rls_policies.sql` en un proyecto Supabase real. No ejecuta SQL, no crea migraciones y no habilita Supabase local.

## Estado

Este esquema es una **propuesta inicial** basada en ARCHITECTURE.md. No debe ejecutarse en produccion sin revision y aprobacion del equipo.

## Pendiente para tareas futuras

- **RLS (Row Level Security)**: politicas de acceso por rol.
- **Storage**: configuracion de buckets para evidencia fotografica.
- **Seeds**: datos iniciales para usuarios autorizados y productos de prueba.

## Notas

- `products` no es inventario oficial. Su unica funcion es resolver codigos de barras durante el registro de merma.
- No se incluye tabla `waste_evidence_files`; la referencia de evidencia se almacena directamente en `waste_records.evidence_path`.
- El esquema incluye la funcion `set_updated_at()` y triggers `before update` para refrescar `updated_at` automaticamente en todas las tablas.
- La eliminacion fisica de perfiles con registros historicos no es el flujo recomendado. Deben desactivarse cambiando `status = 'inactivo'` para preservar la trazabilidad.
- `waste_records.observation` es requerido (`not null`). `waste_records.evidence_path` es nullable porque la foto de evidencia aplica solo cuando es posible segun el caso operativo.
- `profiles.email` tiene restriccion de unicidad.
- Se incluye un `check` constraint que garantiza coherencia entre `product_id` y `product_not_found` en `waste_records`.
- `database/rls_policies.sql` contiene la propuesta de RLS con helpers, policies por tabla y limitaciones documentadas. No ha sido aplicada en Supabase real.
- Los helpers SQL en `rls_policies.sql` usan `security definer` y consultan `public.profiles`. Para evitar recursion RLS indirecta, deben ser creados por un rol propietario con privilegio `BYPASSRLS`. Verificar antes de aplicar en Supabase real.
- `database/APPLY_SUPABASE_CHECKLIST.md` documenta el orden recomendado, las precondiciones, las verificaciones por rol, los riesgos conocidos y el procedimiento de cierre para una futura aplicacion manual de los scripts en Supabase real. Su lectura es obligatoria antes de cualquier despliegue y, por si mismo, no ejecuta SQL, no crea migraciones ni habilita Supabase local.
