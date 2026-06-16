# Guia de despliegue en Vercel - MVP

> Tarea: MVP-049
> Aplicacion: Sistema de Control Operativo de Tienda (Next.js + Supabase).
> Entorno objetivo: Vercel (produccion) con proyecto Supabase del MVP.

Esta guia documenta como llevar la aplicacion del repositorio a Vercel
de forma controlada, sin tocar codigo ni reglas de RLS. Esta pensada para
el equipo tecnico que hara el despliegue y para el supervisor que validara
que la app queda operativa para tienda.

## 1. Resumen del camino de despliegue

1. Preparar el repositorio y la cuenta de Vercel.
2. Preparar el proyecto Supabase del MVP (URL y `anon` key publica).
3. Crear el proyecto en Vercel apuntando al repositorio.
4. Configurar variables de entorno en Vercel (sin subir `.env.local`).
5. Hacer el primer despliegue y validar el build.
6. Verificar la aplicacion en la URL publica.
7. Pasar el checklist de preproduccion antes de abrir la URL a tienda.
8. Dejar el monitoreo basico activo y documentar la URL definitiva.

## 2. Prerequisitos

- Repositorio del proyecto en Git (GitHub, GitLab o Bitbucket) con
  acceso de lectura/escritura para el equipo que hara el despliegue.
- Cuenta en Vercel con permisos para crear proyectos y configurar
  variables de entorno. Se recomienda una cuenta de equipo, no personal.
- Proyecto Supabase del MVP ya creado y operativo para pruebas. Este
  documento asume que la base de datos del MVP existe o se creara en
  una tarea posterior; no se aplica SQL aqui.
- Acceso a las llaves publicas de Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anonima publica del proyecto.
- Node.js 18 o superior y npm disponibles en el equipo de despliegue
  para ejecutar `npm run lint`, `npm run build` y `npm test` antes de
  subir cambios.
- Acceso a la consola de Vercel (web) para configurar el proyecto y
  revisar logs de build y runtime.

## 3. Variables de entorno

La aplicacion publica necesita exactamente dos variables en el navegador
cliente, ambas con el prefijo `NEXT_PUBLIC_`:

- `NEXT_PUBLIC_SUPABASE_URL`
  - Valor: la URL del proyecto Supabase del MVP.
  - Ejemplo de forma: `https://<project-ref>.supabase.co`.
  - Origen: Dashboard de Supabase, seccion Project Settings, API.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Valor: la clave anonima publica del proyecto Supabase del MVP.
  - Origen: Dashboard de Supabase, seccion Project Settings, API.
  - Esta clave es publica y esta pensada para usarse en el cliente. Aun
    asi, no se debe commitear al repositorio.

Reglas obligatorias:

- No subir `.env.local` al repositorio. Verificar que `.env.local` este
  listado en `.gitignore`.
- Mantener `.env.example` en el repositorio solo con placeholders, no
  con valores reales.
- No usar `service_role` keys ni tokens administrativos en variables de
  Vercel accessibles al cliente. Si se requieren para tareas tecnicas,
  se manejan por canales separados fuera de la app.
- Configurar las dos variables en Vercel para cada entorno donde se
  quiera ejecutar la app (por ejemplo, `Production` y `Preview`).
- Si se usan environments separados en Vercel, cada environment debe
  apuntar a un proyecto Supabase distinto o al mismo, segun la politica
  del equipo. Mezclar `Preview` con datos reales de tienda no es
  recomendado.

## 4. Pasos de despliegue

### Paso 1. Preparar el repositorio

- Confirmar que la rama principal del repositorio esta en verde:
  - `npm run lint` sin errores.
  - `npm run build` finaliza correctamente.
  - `npm test` finaliza con todos los tests en verde.
- Confirmar que `.env.local`, `.env.production.local` y similares estan
  en `.gitignore`.
- Confirmar que `.env.example` solo contiene placeholders.

### Paso 2. Crear el proyecto en Vercel

- Entrar a la consola de Vercel y elegir "Add New > Project".
- Conectar el repositorio del proyecto (GitHub, GitLab o Bitbucket).
- En "Framework Preset", elegir Next.js. Vercel lo detecta
  automaticamente en la mayoria de los casos.
- En "Root Directory", dejar el valor por defecto (la raiz del
  repositorio), salvo que el proyecto viva en un subdirectorio.
- En "Build and Output Settings", no modificar los comandos por
  defecto. Vercel usa `next build` automaticamente.
- En "Environment Variables", agregar las dos variables descritas en
  la seccion 3 para el entorno `Production`. Repetir para `Preview` si
  se quiere que los pull requests tengan su propia URL con Supabase.
- Crear el proyecto. Vercel lanzara el primer build automaticamente.

### Paso 3. Validar el build inicial

- Abrir la pestana "Deployments" del proyecto en Vercel.
- Revisar el log del primer build:
  - Debe terminar con estado "Ready".
  - El paso "Build" debe mostrar que `next build` finalizo sin errores.
  - El paso "TypeScript" debe finalizar sin errores.
- Si el build falla:
  - Revisar el log para identificar el paso que fallo.
  - Corregir el problema en el repositorio y hacer un nuevo push; Vercel
    intentara el build automaticamente.
  - No avanzar a los pasos siguientes hasta tener un build "Ready".

### Paso 4. Verificar la aplicacion desplegada

- Abrir la URL publica que Vercel asigna al proyecto (dominio
  `.vercel.app` por defecto).
- Verificar que la pagina principal carga y muestra los bloques IO, MR,
  HO y CP descritos en la guia de uso.
- Verificar que la navegacion entre los modulos responde.
- Si la pagina principal carga pero un modulo falla, revisar la consola
  del navegador y los logs de runtime en Vercel.

### Paso 5. Conectar dominio personalizado (opcional)

- Si la tienda usara un dominio propio (recomendado para uso en
  produccion), configurarlo en Vercel: Settings, Domains.
- Esperar a que el certificado SSL se emita y se renueve solo.
- Verificar que el dominio personalizado sirve la misma aplicacion que
  el dominio `.vercel.app`.

## 5. Checklist de preproduccion (antes de abrir la URL a tienda)

Antes de comunicar la URL a las tiendas, confirmar punto por punto:

- [ ] El build en Vercel esta en estado "Ready" para la rama principal.
- [ ] Las variables `NEXT_PUBLIC_SUPABASE_URL` y
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` estan configuradas en el entorno
      correspondiente de Vercel (Production y, si aplica, Preview).
- [ ] Las variables de Vercel apuntan al proyecto Supabase del MVP
      (no a un proyecto personal o de pruebas).
- [ ] La URL publica carga la pagina principal sin errores en la consola
      del navegador.
- [ ] La navegacion entre IO, MR, HO y CP funciona en la URL publica.
- [ ] Si hay autenticacion habilitada, un usuario valido puede iniciar
      sesion desde la URL publica.
- [ ] Los registros enviados desde la URL publica se reflejan en
      Supabase segun la matriz de permisos vigente.
- [ ] `.env.local`, `.env.production.local` y cualquier archivo con
      secretos NO estan en el repositorio (`git status` y `git log`
      verificados).
- [ ] La guia [`docs/USO_MINIMO.md`](USO_MINIMO.md) coincide con el
      comportamiento observado de la app desplegada.
- [ ] Hay un canal claro para reportar incidencias: a quien escribir y
      con que datos (URL, modulo, hora, que se intento).
- [ ] Si la app mostrara datos reales, se cumple la politica interna del
      equipo sobre datos en produccion y se registro el despliegue en el
      `CHANGELOG.md`.

## 6. Checklist de verificacion post-despliegue

Una vez que la URL esta en uso por tienda, verificar de forma regular:

- [ ] La URL publica sigue respondiendo y el certificado SSL esta
      vigente.
- [ ] Los modulos IO, MR, HO y CP cargan sin errores visibles.
- [ ] Los registros nuevos aparecen en Supabase con `created_by`
      correcto.
- [ ] El catalogo de productos carga con su buscador y su boton de
      copiar ID.
- [ ] El escaner de codigo de barras (cuando se usa desde celular)
      detecta codigos y rellena el formulario.
- [ ] Las imagenes de evidencia se adjuntan cuando el usuario las
      selecciona.
- [ ] El historial operativo persiste entre recargas en el navegador
      usado por la tienda.
- [ ] No hay picos inusuales de errores en los logs de Vercel.

## 7. Si algo sale mal (fallos comunes)

### 7.1 La pagina no carga despues del despliegue

- Revisar el estado del ultimo deploy en Vercel. Si esta en "Error",
  abrir el log de build y corregir.
- Verificar que la rama principal (o la rama conectada) tiene los
  ultimos cambios. Vercel despliega la rama que se le indico, no
  siempre la rama por defecto del repositorio.
- Si el deploy es "Ready" pero la pagina sigue sin cargar, abrir la
  consola del navegador (F12) y revisar errores. Si los errores son de
  Supabase, saltar a 7.2.

### 7.2 Errores relacionados con Supabase

- "Invalid API key" o "Invalid URL":
  - Las variables `NEXT_PUBLIC_SUPABASE_URL` o
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` no estan bien configuradas en
    Vercel, o apuntan a otro proyecto.
  - Verificarlas en Settings, Environment Variables, sin reescribirlas
    a mano en el navegador.
- "Permission denied" o "row-level security":
  - El usuario que intenta la operacion no tiene el rol/perfil
    adecuado, o la policy en Supabase no esta aplicada.
  - Verificar que las policies del MVP (`database/rls_policies.sql`)
    fueron aplicadas en el proyecto Supabase correspondiente y que el
    usuario tiene perfil activo.
- Cambios de variables que no se ven reflejados:
  - En Vercel, los cambios de variables aplican al siguiente deploy.
  - Forzar un redeploy desde la pestana Deployments.

### 7.3 Build que falla en Vercel pero pasa en local

- Revisar la version de Node: Vercel usa una version por defecto. Si el
  proyecto requiere una version especifica, configurarla en Settings,
  General, Node.js Version.
- Revisar si hay dependencias que requieren variables en tiempo de
  build distintas a las de runtime. En este MVP solo se esperan las dos
  variables `NEXT_PUBLIC_*`.
- Revisar si el build local uso `node_modules` o caches especificos
  que no estan en el repositorio. Limpiar `node_modules` y volver a
  instalar antes de comparar.
- Comparar el comando que Vercel ejecuta con el comando local:
  - Vercel: `next build` por defecto.
  - Local recomendado: `npm run build`.

### 7.4 La app funciona en Preview pero no en Production

- Verificar que las variables de entorno estan configuradas para
  `Production` y no solo para `Preview`.
- Verificar el dominio asignado: que la URL abierta sea la de
  produccion y no la de un deploy de preview.
- Si la app carga pero no conecta a Supabase, revisar la URL y la
  `anon key` del entorno Production: pueden ser las de un proyecto de
  pruebas.

### 7.5 Problemas con el escaner de codigo de barras o la camara

- El escaner usa `BarcodeDetector`, una API del navegador. No todos
  los navegadores la soportan.
- En el celular de tienda, comprobar que se esta usando un navegador
  compatible (Chrome actualizado o el navegador recomendado por
  administracion tecnica).
- Verificar que la pagina tiene permiso para acceder a la camara. Si
  el permiso fue denegado, el navegador lo recuerda hasta que se
  cambie manualmente en su configuracion.
- Mientras el problema se resuelve, los usuarios pueden capturar el
  codigo a mano o usar el boton "Catalogo" para buscarlo.

### 7.6 Problemas con imagenes de evidencia

- Si la imagen no se adjunta, verificar que el formato es uno de los
  aceptados por la app: JPG, PNG, WebP, GIF, BMP o AVIF.
- Verificar tamano y peso del archivo. Imagenes muy pesadas pueden
  tardar o fallar.
- Recordar: la foto de evidencia es opcional. Si la camara o el
  dispositivo impide adjuntarla, se puede registrar la merma con la
  observacion escrita.

### 7.7 Datos que no aparecen o desaparecen del historial

- En este MVP el historial local vive en el navegador del usuario.
  Cambiar de navegador, limpiar datos del sitio o usar modo incognito
  puede vaciar el historial visible.
- Si la app ya esta conectada a Supabase, los registros enviados
  persisten alli aunque el historial local se borre.
- Si la app no esta conectada a Supabase todavia, los registros son
  solo locales y se perderan al limpiar el navegador. Avisar a tienda
  para no depender de ellos como fuente unica.

### 7.8 Errores que no se entienden

- Capturar: URL, modulo, hora, navegador, mensaje exacto y, si es
  posible, una captura de pantalla.
- Revisar los logs de runtime en Vercel (Functions o Logs segun la
  configuracion) y comparar con la consola del navegador.
- Si el error parece venir de Supabase, revisar los logs del proyecto
  Supabase (Dashboard, Logs) en la misma ventana de tiempo.
- Reportar al equipo tecnico con todos los datos anteriores. No
  intentar parchar en caliente sin revision.

## 8. Operacion habitual despues del despliegue

- Redeploy automatico: cada push a la rama principal genera un nuevo
  deploy. Verificar que el build queda "Ready" antes de considerar la
  nueva version disponible.
- Promover un deploy de Preview a Production: en la pestana Deployments,
  seleccionar un deploy de Preview y usar "Promote to Production".
- Revertir un cambio problematico: usar "Rollback" en el deploy activo
  para volver al deploy "Ready" anterior. Esto no borra el historial de
  deploys.
- Actualizar variables de entorno: cualquier cambio requiere un nuevo
  deploy para aplicarse.
- Cambios de llaves en Supabase: si se rotan la `anon` key o la URL del
  proyecto, actualizar las variables en Vercel y redeploy.
- Despliegues y datos de prueba: evitar usar el entorno de Production
  con datos sensibles de prueba. Si se requiere un entorno de pruebas,
  configurar un environment `Preview` con un proyecto Supabase aparte.

## 9. Soporte post-despliegue para tienda

Una vez que la app esta en produccion y la tienda la usa, el equipo
tecnico debe tener un canal de soporte activo y un protocolo de
incidencias. Ver `docs/SOPORTE.md` para el protocolo completo.

Resumen del protocolo para el equipo de despliegue:

- Entregar a la tienda la URL definitiva y la guia de uso
  (`docs/USO_MINIMO.md`).
- Entregar al supervisor el protocolo de soporte (`docs/SOPORTE.md`)
  con los canales de contacto rellenados (nivel 2, nivel 3, grupo de
  emergencia).
- Confirmar que la tienda sabe que hacer cuando:
  - La app no carga.
  - El login falla.
  - Un formulario no envia.
  - El catalogo no muestra un producto.
  - La evidencia no se adjunta.
  - El historial local desaparece.
- Verificar que la tienda tiene un workaround de papel para seguir
  operando mientras se resuelve una incidencia.
- Revisar las incidencias reportadas al menos una vez por semana para
  detectar patrones que necesiten correccion en la app.

## 10. Aviso final

Esta guia describe el camino de despliegue y los pasos de verificacion
asociados al MVP actual. Si en el futuro se agregan nuevos servicios,
nuevas variables de entorno o nuevos modulos que dependan de Supabase,
hay que actualizar este documento ademas del codigo y de los archivos
de configuracion del proyecto. No aplicar esta guia como sustituto de
politicas internas del equipo sobre gestion de llaves, accesos o datos
de produccion.
