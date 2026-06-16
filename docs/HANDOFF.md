# Handoff final de mantenimiento - MVP

> Tarea: MVP-075
> Version: 0.1.0
> Fecha: 2026-06-05
> Aplicacion: Sistema de Control Operativo de Tienda

Este documento es el handoff tecnico para quien mantenga o amplie la
aplicacion. Resume el estado final del proyecto, la arquitectura, los
procedimientos de mantenimiento y el punto de partida para futuras
mejoras.

## 1. Estado final del proyecto

### 1.1 Lo que esta listo

| Modulo | Funcionalidad | Estado |
|--------|---------------|--------|
| Instrucciones Operativas | Crear, consultar, filtrar, cambiar estado, eliminar local | Listo |
| Registro de Merma | Crear con barcode/catalogo/escaner, evidencia, consultar, cambiar estado | Listo |
| Historial Operativo | Vista unificada, filtros avanzados, export/import JSON, deshacer | Listo |
| Catalogo de Productos | 9,624 productos, busqueda por EAN/material/nombre | Listo |
| Autenticacion | Supabase Auth login/logout, perfil de tienda, modo local fallback | Listo |
| Evidencia fotografica | Adjuntar imagen opcional, preview, validacion de formato | Listo |
| Escaner de barras | BarcodeDetector API, fallback manual/catalogo | Listo |

### 1.2 Lo que NO esta en este MVP

- Notificaciones push ni recordatorios de instrucciones pendientes.
- Recuperacion de clave desde la app.
- Autenticacion de dos factores.
- Edicion de productos desde la app.
- Dashboard ni reportes graficos.
- Integracion con sistemas externos (ERP, inventario, etc.).
- Multi-idioma.
- Modo offline completo con sincronizacion.
- Aplicacion nativa (solo web responsive).

### 1.3 Alcance cerrado

Este MVP cubre el registro y consulta de instrucciones operativas y
merma en tienda retail, con autenticacion basica, catalogo de productos
y evidencia fotografica. No cubre administracion de usuarios, catalogo,
ni integraciones. Esas funciones se mantienen fuera de la app por
procesos tecnicos o manuales controlados.

## 2. Arquitectura a grandes rasgos

### 2.1 Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Backend-as-a-Service**: Supabase (PostgreSQL + Auth + Storage).
- **Autenticacion**: Supabase Auth (email/password).
- **Almacenamiento de evidencia**: Supabase Storage (modo Supabase) o localStorage (modo local).
- **Catalogo de productos**: Archivo JSON local (9,624 productos) + tabla `products` en Supabase.
- **Historial local**: localStorage del navegador (modo local).
- **Pruebas**: Node.js test runner nativo (sin Jest ni Vitest).

### 2.2 Modos de ejecucion

La app tiene dos modos automaticos segun las variables de entorno:

- **Modo local**: cuando no hay `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Usa perfiles de desarrollo, historial local, catalogo local y no requiere autenticacion.
- **Modo Supabase**: cuando ambas variables estan presentes. Usa Supabase Auth, perfiles reales, base de datos remota y Storage para evidencia.

El modo se detecta automaticamente en `src/lib/app/runtime-mode.ts` y el
bootstrap en `src/lib/app/app-bootstrap.ts` configura los adaptadores
correspondientes.

### 2.3 Estructura de directorios clave

```
src/
  app/                    # Paginas y componentes de UI
    page.tsx              # Pantalla principal
    layout.tsx            # Layout servidor (metadata)
    ClientLayout.tsx      # Layout cliente (bootstrap, auth)
    login/                # Login/logout
    instructions/         # Bandeja de instrucciones
    instructions/new/     # Formulario de instrucciones
    waste/                # Bandeja de merma
    waste/new/            # Formulario de merma
    history/              # Historial operativo
    products/             # Catalogo de productos
  lib/
    app/                  # Capa de aplicacion (hooks, repos, bootstrap)
    domain/               # Tipos, catalogos, validadores, payloads
    services/             # Capa de servicios (inserts)
    supabase/             # Adaptadores Supabase (gateway, storage, auth)
  tests/                  # Pruebas unitarias
    domain/               # Validadores, payloads, submissions
    services/             # Servicios de insercion
    supabase/             # Adaptadores Supabase
    app/                  # App layer, UI logic, flows
  docs/                   # Documentacion
  database/               # SQL propuesto (schema, RLS, checklist)
```

### 2.4 Flujo de datos

```
UI (formulario) -> submit flow -> operation submitter -> service -> gateway -> Supabase
```

- Los formularios no conocen Supabase directamente.
- La capa de aplicacion (`app/`) compone servicios y adaptadores.
- La capa de dominio (`domain/`) es pura y sin dependencias.
- Los servicios (`services/`) orquestan validacion + persistencia.
- Los adaptadores Supabase (`supabase/`) traducen entre el contrato interno y Supabase.

## 3. Como correr localmente

```bash
# Instalar dependencias
npm install

# Sin variables (modo local)
npm run dev
# Abrir http://localhost:3000

# Con variables (modo Supabase)
# Crear .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

### 3.1 Pruebas

```bash
npm run lint      # 0 errores esperados
npm run build     # Debe generar 10 paginas estaticas
npm test          # 392/392 tests esperados
```

Si un test falla, revisar primero que no haya cambios en `src/lib/domain`
ni `database`, que son archivos estables. Los tests mas probables de
romper son los de UI logic (`tests/app/*-ui.test.mjs`) si cambian los
filtros o la logica de renderizado.

### 3.2 Modo local

En modo local, la app arranca sin configuracion adicional. Usa:
- `DEV_PROFILE` como perfil de usuario.
- `localStorage` para historial local.
- Catalogo JSON local para productos.
- No requiere autenticacion.

Esto permite desarrollar y probar sin conectividad a Supabase.

## 4. Como desplegar

Ver `docs/DEPLOY_VERCEL.md` para el paso a paso completo. Resumen:

1. Confirmar que `npm run lint`, `npm run build` y `npm test` pasan en local.
2. Confirmar que `.env.local` esta en `.gitignore`.
3. Crear proyecto en Vercel apuntando al repositorio.
4. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel.
5. Hacer deploy y verificar que el build queda "Ready".
6. Validar la URL publica con la checklist de `docs/DEPLOY_VERCEL.md`.

### 4.1 Actualizaciones despues del primer despliegue

- Cada push a la rama principal genera un nuevo deploy automatico.
- Verificar que el build queda "Ready" antes de considerar la nueva version disponible.
- Si un deploy falla, usar "Rollback" en Vercel para volver al deploy anterior.
- Cualquier cambio de variables de entorno requiere un nuevo deploy.

## 5. Mantenimiento habitual

### 5.1 Agregar un producto al catalogo

No se hace desde la app. Opciones:
- **Modo local**: editar `src/lib/app/product-catalog-data.json` (cuidado, 1.6 MB).
- **Modo Supabase**: insertar directamente en la tabla `products` via SQL o dashboard.
- **Batch**: usar `src/lib/app/product-seed.ts` para seed idempotente.

### 5.2 Crear un usuario de tienda

No se hace desde la app. Pasos:
1. Crear usuario en Supabase Auth (dashboard o API).
2. Crear perfil en tabla `profiles` con `user_id`, `display_name`, `role`, `status="activo"`.
3. Entregar credenciales al usuario.

### 5.3 Cambiar el rol de un usuario

Editar directamente la tabla `profiles` en Supabase. No hay UI de
administracion en la app.

### 5.4 Rotar claves de Supabase

1. Rotar `anon key` en Supabase Dashboard.
2. Actualizar `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel.
3. Forzar redeploy.
4. Avisar a la tienda para que cierre y vuelva a abrir sesion.

### 5.5 Actualizar dependencias

```bash
npm update
npm run lint
npm run build
npm test
```

Si algo falla, revisar compatibilidad de versiones. Next.js 16, React 19
y Tailwind 4 son recientes; actualizar con precaucion.

## 6. Limitaciones conocidas y como mitigarlas

| Limitacion | Mitigacion | Plan futuro |
|------------|------------|-------------|
| Historial local se pierde al cambiar de navegador | Conectar a Supabase en produccion | No aplica; Supabase ya lo resuelve |
| Evidencia local se pierde al limpiar datos | Conectar a Supabase en produccion | No aplica; Supabase Storage ya lo resuelve |
| Escaner requiere BarcodeDetector API | Usar entrada manual o catalogo | Evaluar libreria de escaneo mas compatible |
| Sin notificaciones | Revisar manualmente la bandeja | Fuera de alcance del MVP |
| Sin recuperacion de clave | Contactar administracion tecnica | Fuera de alcance del MVP |
| Sin modo offline con sincronizacion | Usar conexion a internet | Fuera de alcance del MVP |
| Eliminacion solo en modo local | En Supabase, usar estado "anulada" | Comportamiento por diseno |

## 7. Punto de partida para futuras ampliaciones

Si se decide continuar el proyecto, estos son los puntos de partida
naturales, ordenados por complejidad:

### 7.1 Mejoras de UX (baja complejidad)

- Agregar busqueda global en la pantalla principal.
- Mejorar filtros de bandeja con guardado de presets.
- Agregar paginacion en el historial si crece mucho.
- Mejorar feedback visual de acciones (toast notifications).

### 7.2 Nuevas funcionalidades (media complejidad)

- Notificaciones push para instrucciones pendientes.
- Recuperacion de clave via email.
- Dashboard con conteos y graficos simples.
- Exportar a Excel en lugar de solo JSON.
- Multi-idioma (espanol + ingles).

### 7.3 Ampliaciones de arquitectura (alta complejidad)

- Modo offline con sincronizacion (service worker + IndexedDB).
- Integracion con ERP o sistema de inventario.
- API REST propia para desacoplar de Supabase.
- Aplicacion nativa (React Native / PWA installable).
- Administracion de usuarios y perfiles desde la app.

### 7.4 Como agregar un nuevo modulo

1. Crear tipos en `src/lib/domain/types.ts`.
2. Crear catalogos en `src/lib/domain/catalogs.ts`.
3. Crear validador en `src/lib/domain/validators.ts`.
4. Crear payload en `src/lib/domain/payloads.ts`.
5. Crear servicio en `src/lib/services/operation-inserts.ts`.
6. Crear adaptador Supabase en `src/lib/supabase/`.
7. Crear hook en `src/lib/app/`.
8. Crear paginas y componentes en `src/app/`.
9. Agregar tests en `tests/app/`.
10. Actualizar guias de uso y entrega.

Este patron se uso para IO y MR y funciona de forma consistente.

## 8. Documentacion del proyecto

| Documento | Para quien | Que contiene |
|-----------|------------|--------------|
| `README.md` | Todos | Resumen, arranque, stack |
| `docs/USO_MINIMO.md` | Tienda | Guia de uso diario |
| `docs/SOPORTE.md` | Supervisor + tecnico | Protocolo de incidencias |
| `docs/DEPLOY_VERCEL.md` | Equipo tecnico | Despliegue, checklist, fallos |
| `docs/ENTREGA_FINAL.md` | Todos | Estado de modulos, checklist, incidencias |
| `docs/HANDOFF.md` | Equipo tecnico | Este documento: mantenimiento, handoff |
| `CHANGELOG.md` | Equipo tecnico | Historial de tareas |
| `database/schema.sql` | Equipo tecnico | Esquema de base de datos propuesto |
| `database/rls_policies.sql` | Equipo tecnico | RLS y policies propuestas |
| `database/APPLY_SUPABASE_CHECKLIST.md` | Equipo tecnico | Checklist para aplicar SQL en Supabase |

## 9. Versiones y compatibilidad

- **Node.js**: 18 o superior.
- **Next.js**: 16.2.7.
- **React**: 19.2.4.
- **TypeScript**: 5.x.
- **Tailwind CSS**: 4.x.
- **Supabase JS client**: 2.107.0.

No se recomienda actualizar Next.js o React sin pruebas exhaustivas,
ya que la app usa caracteristicas recientes (App Router, Server Components,
metadata exports, React 19).

## 10. Contacto y responsabilidades

Este apartado se completa con los datos reales del equipo:

- **Responsable del proyecto**: ______________________________
- **Equipo tecnico de mantenimiento**: _________________________
- **Supervisor de tienda de referencia**: ______________________
- **Acceso al repositorio**: _________________________________
- **Acceso a Vercel**: ______________________________________
- **Acceso a Supabase**: ____________________________________

## 11. Cierre del MVP

- **Version entregada**: 0.1.0 (MVP-001 a MVP-075).
- **Fecha de cierre**: 2026-06-05.
- **Estado**: Completado y listo para adopcion.
- **Pruebas finales**: 392/392 tests pasan, 0 errores de lint, build genera 10 paginas estaticas.
- **Modo local**: Funcional sin configuracion.
- **Modo Supabase**: Requiere variables de entorno y base de datos configurada.

Para cualquier ampliacion, crear una nueva version y seguir el patron de
modulos establecido en este handoff.
