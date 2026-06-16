# Paquete de entrega final - MVP

> Tarea: MVP-074
> Version: 0.1.0
> Fecha: 2026-06-05
> Aplicacion: Sistema de Control Operativo de Tienda

Este documento es la referencia unica de entrega para la tienda y el equipo
tecnico. Resume el estado de cada modulo, el checklist de arranque, las
incidencias conocidas y los pasos de validacion para que la app quede lista
para adopcion y seguimiento.

## 1. Resumen ejecutivo

El MVP entrega una aplicacion web responsive para el registro y consulta de:

- Instrucciones operativas (IO).
- Registros de merma (MR).
- Historial operativo unificado (HO).
- Catalogo de productos (CP).

La app funciona en modo local (sin conexion a base de datos) y en modo
Supabase (conectada a base de datos en la nube). El modo local se usa para
pruebas y cuando no hay conectividad. El modo Supabase se usa en produccion.

### 1.1 Estado de entrega

| Modulo | Estado | Funcionalidad |
|--------|--------|---------------|
| Instrucciones Operativas | Listo | Crear, consultar, filtrar por estado/prioridad, cambiar estado, eliminar local |
| Registro de Merma | Listo | Crear con barcode, catalogo, escaner, evidencia, consultar, filtrar, cambiar estado, eliminar local |
| Historial Operativo | Listo | Vista unificada, filtros por tipo/estado/fecha/texto/responsable, exportar/importar JSON, deshacer |
| Catalogo de Productos | Listo | Busqueda por EAN/material/nombre, 9,624 productos cargados |
| Autenticacion | Listo | Login con Supabase Auth, logout, perfil de tienda, modo local sin auth |
| Evidencia fotografica | Listo | Adjuntar imagen opcional en merma, preview, validacion de formato |
| Escaner de barras | Listo | BarcodeDetector API, fallback manual/catalogo |

### 1.2 Roles habilitados

- Supervisor: puede crear, editar, anular y eliminar (local).
- Segundo al mando: puede crear y dar seguimiento.
- Tercero al mando: puede crear y dar seguimiento.
- Asistentes: no usan la app en el MVP (fuera de alcance).

## 2. Checklist de arranque para tienda

Antes de que la tienda empiece a usar la app, confirmar estos puntos:

### 2.1 Infraestructura

- [ ] La app esta desplegada en Vercel con URL publica.
- [ ] Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      estan configuradas en Vercel para el entorno de produccion.
- [ ] El proyecto Supabase tiene las tablas `profiles`, `products`, `instructions`
      y `waste_records` creadas con los schema y RLS aplicados (ver
      `database/APPLY_SUPABASE_CHECKLIST.md`).
- [ ] El catalogo de productos esta cargado en Supabase (usar el seed de
      `src/lib/app/product-seed.ts` si es necesario).
- [ ] Los usuarios de tienda tienen perfiles creados en la tabla `profiles` de
      Supabase con rol y estado activo.
- [ ] Los usuarios tienen credenciales de Supabase Auth (email/clave) y saben
      como acceder.

### 2.2 Dispositivos

- [ ] Se definio el navegador recomendado para la tienda (Chrome, Edge, etc.).
- [ ] Se definio si la app se usara en celular, computador o ambos.
- [ ] Se verifico que el escaner de barras funciona en el dispositivo elegido.
- [ ] Se verifico que la camara permite adjuntar evidencia fotografica.
- [ ] Se tiene un plan de papel para seguir operando si la app falla.

### 2.3 Documentacion entregada

- [ ] La tienda recibio `docs/USO_MINIMO.md` (guia de uso diario).
- [ ] El supervisor recibio `docs/SOPORTE.md` (protocolo de incidencias).
- [ ] El equipo tecnico recibio `docs/DEPLOY_VERCEL.md` (guia de despliegue).
- [ ] El supervisor sabe a quien escalar cada tipo de problema.
- [ ] La tienda sabe que hacer cuando algo falla (workarounds).

### 2.4 Pruebas de humo

- [ ] Login funciona con un usuario real de tienda.
- [ ] Se puede crear una instruccion operativa y aparece en el historial.
- [ ] Se puede crear un registro de merma y aparece en el historial.
- [ ] Se puede buscar un producto en el catalogo.
- [ ] Se puede cambiar el estado de una instruccion y de una merma.
- [ ] El historial muestra los registros creados.
- [ ] La exportacion JSON funciona y el archivo se descarga.
- [ ] La importacion JSON funciona (modo combinar y reemplazar).
- [ ] El modo local funciona si se abre la app sin variables de entorno.

## 3. Estado detallado de modulos

### 3.1 Instrucciones Operativas (IO)

- Funcionalidades:
  - Crear instruccion con responsable, texto, prioridad, observaciones.
  - Estado inicial: pendiente.
  - Estados posibles: pendiente, en proceso, cumplida, no cumplida,
    requiere seguimiento, anulada.
  - Bandeja con filtros por estado y prioridad.
  - Cambio de estado via select desplegable.
  - Eliminacion individual en modo local.
  - Limpieza total en modo local.
- Limitaciones:
  - Solo supervisor puede anular (controlado por RLS en Supabase).
  - En modo local, cualquier usuario puede eliminar (sin RLS).
  - No hay notificaciones ni recordatorios.

### 3.2 Registro de Merma (MR)

- Funcionalidades:
  - Crear registro con barcode, producto (opcional), cantidad, unidad, motivo,
    responsable, area, observacion, evidencia fotografica.
  - Estado inicial: pendiente de revision.
  - Estados posibles: pendiente de revision, revisado, recuperable,
    no recuperable, requiere seguimiento, anulado.
  - Autocompletado de producto desde barcode (catalogo local).
  - Escaner de codigo de barras con camara.
  - Busqueda de producto en catalogo.
  - Adjuntar evidencia fotografica (JPG, PNG, WebP, GIF, BMP, AVIF).
  - Bandeja con filtros por estado y presencia de evidencia.
  - Cambio de estado via select desplegable.
  - Eliminacion individual en modo local.
  - Limpieza total en modo local.
- Limitaciones:
  - Evidencia local se pierde al limpiar datos del navegador.
  - En modo Supabase, la evidencia se almacena en Supabase Storage.
  - El escaner requiere navegador con soporte BarcodeDetector.
  - Solo supervisor puede cerrar o anular (controlado por RLS en Supabase).

### 3.3 Historial Operativo (HO)

- Funcionalidades:
  - Vista unificada de instrucciones y merma.
  - Filtros por tipo, estado, texto, fecha, responsable.
  - Detalle expandible por entrada con metadata completa.
  - Exportacion a JSON (con filtros aplicados y fecha).
  - Importacion desde JSON (modo combinar o reemplazar).
  - Deteccion de duplicados en importacion.
  - Accion de deshacer para eliminacion y limpieza (5 minutos de vigencia).
  - Persistencia de filtros, entrada expandida y modo de importacion.
- Limitaciones:
  - Historial local vive en el navegador (localStorage).
  - Cambiar de navegador o dispositivo pierde el historial local.
  - Si esta conectado a Supabase, los registros persisten en base de datos.

### 3.4 Catalogo de Productos (CP)

- Funcionalidades:
  - 9,624 productos cargados desde Excel.
  - Busqueda por EAN, codigo de material o nombre.
  - Busqueda con debounce (300 ms).
  - Boton para copiar ID al portapapeles.
  - Resolucion de producto desde barcode en formulario de merma.
- Limitaciones:
  - Catalogo no se edita desde la app.
  - Inclusion o correccion de productos requiere proceso tecnico.
  - En modo Supabase, el catalogo se consulta desde la tabla `products`.

### 3.5 Autenticacion

- Funcionalidades:
  - Login con email y clave via Supabase Auth.
  - Logout.
  - Perfil de tienda vinculado al usuario (nombre, rol, estado).
  - Modo local sin autenticacion (perfil de desarrollo).
  - Header con estado de sesion y nombre del usuario.
- Limitaciones:
  - Creacion de usuarios y perfiles se hace fuera de la app.
  - No hay recuperacion de clave desde la app.
  - No hay autenticacion de dos factores.

## 4. Incidencias conocidas y pendientes menores

Las siguientes son limitaciones o comportamientos conocidos que no
bloquean el uso pero conviene tener presentes:

| # | Incidencia | Impacto | Workaround | Plan de accion |
|---|------------|---------|------------|----------------|
| 1 | Historial local se pierde al cambiar de navegador o limpiar datos | Medio | Usar siempre el mismo dispositivo/navegador; conectar a Supabase para persistencia real | Documentado en SOPORTE.md; conectar a Supabase en produccion |
| 2 | Evidencia fotografica local se pierde al limpiar datos del navegador | Medio | Adjuntar foto siempre; en modo Supabase la foto se guarda en Storage | Conectar a Supabase en produccion |
| 3 | Escaner de barras requiere navegador con BarcodeDetector API | Medio | Capturar barcode manualmente o usar catalogo | Documentado en USO_MINIMO.md |
| 4 | No hay notificaciones ni recordatorios de instrucciones pendientes | Medio | Revisar manualmente la bandeja de IO | Fuera de alcance del MVP |
| 5 | No hay recuperacion de clave desde la app | Medio | Contactar administracion tecnica para reset | Fuera de alcance del MVP |
| 6 | Catalogo de productos no se edita desde la app | Medio | Avisar a supervisor para inclusion por proceso tecnico | Fuera de alcance del MVP |
| 7 | Eliminacion de registros solo funciona en modo local | Bajo | En modo Supabase, los registros se anulan cambiando estado a "anulada" o "anulado" | Comportamiento por diseno; RLS controla eliminacion en Supabase |

## 5. Referencias rapidas

| Documento | Para quien | Que contiene |
|-----------|------------|--------------|
| `README.md` | Todos | Resumen del proyecto, arranque rapido, stack |
| `docs/USO_MINIMO.md` | Tienda | Guia de uso diario, pasos operativos, troubleshooting |
| `docs/SOPORTE.md` | Supervisor + tecnico | Protocolo de incidencias, escalamiento, workarounds |
| `docs/DEPLOY_VERCEL.md` | Equipo tecnico | Despliegue en Vercel, checklist, fallos comunes |
| `docs/ENTREGA_FINAL.md` | Todos | Este documento: estado de modulos, checklist, incidencias |
| `CHANGELOG.md` | Equipo tecnico | Historial de tareas y cambios del MVP |

## 6. Validacion de salida

Antes de declarar el MVP entregado, confirmar:

- [ ] Todos los modulos de la seccion 1.1 estan en estado "Listo".
- [ ] El checklist de arranque de la seccion 2 esta completo.
- [ ] Las incidencias conocidas de la seccion 4 estan documentadas y tienen
      workaround.
- [ ] La tienda tiene acceso a `docs/USO_MINIMO.md` y `docs/SOPORTE.md`.
- [ ] El equipo tecnico tiene acceso a `docs/DEPLOY_VERCEL.md` y este
      documento.
- [ ] `npm run lint`, `npm run build` y `npm test` pasan en el repositorio.
- [ ] El build en Vercel esta en estado "Ready".
- [ ] La URL publica funciona y los modulos responden.
- [ ] El modo local funciona como fallback.
- [ ] `CHANGELOG.md` esta actualizado hasta MVP-074.

## 7. Version de este paquete

- Version: MVP-074
- Fecha: 2026-06-05
- Aplicacion: Sistema de Control Operativo de Tienda
- Repositorio: ver README.md
- Stack: Next.js, TypeScript, Tailwind CSS, Supabase

Este paquete cierra el ciclo del MVP. Para ampliaciones o nuevos
modulos, crear una nueva version y actualizar este documento.
