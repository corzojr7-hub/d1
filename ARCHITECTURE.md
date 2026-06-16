# ARCHITECTURE - Sistema de Control Operativo de Tienda

## 1. Proposito

Este documento define la arquitectura inicial concreta del MVP para preparar la futura implementacion web sin programar todavia.

El MVP se mantiene limitado a dos modulos:

- Registro de Instrucciones Operativas.
- Registro de Merma.

Quedan fuera del alcance: firma digital, integraciones corporativas, inventario oficial, nomina, dashboards avanzados, app movil nativa, IA predictiva y uso directo por asistentes.

## 2. Principios de arquitectura

### Simplicidad

- Preferir tablas y flujos directos antes que abstracciones complejas.
- Evitar entidades genericas si el MVP solo necesita instrucciones y merma.
- Mantener formularios cortos, estados claros y consultas basicas.
- No depender de sistemas corporativos ni de inventario oficial.

### Mobile-first

- La experiencia principal se disena para celular en tienda.
- Los formularios deben requerir pocos pasos y controles tactiles faciles de usar.
- Las listas deben cargar rapido y priorizar filtros simples.
- La captura de foto y escaneo deben funcionar desde navegador cuando el dispositivo lo permita.

### Trazabilidad

- Cada registro debe guardar fecha, hora, usuario que registra, responsable operativo y estado.
- Los cambios de estado deben conservar suficiente contexto para auditoria basica del MVP.
- Las evidencias fotograficas de merma deben quedar asociadas al registro correspondiente.
- Los productos no encontrados deben registrarse sin bloquear el flujo operativo.

### Bajo riesgo

- Usar stack conocido y administrado: Next.js, TypeScript, Tailwind CSS, Supabase y Vercel.
- Usar Supabase Auth para no crear autenticacion propia.
- Usar Supabase Storage para evidencias en lugar de guardar imagenes en base de datos.
- Mantener permisos funcionales simples y alineados con los tres roles aprobados.

## 3. Stack esperado

- Frontend: Next.js con TypeScript.
- Estilos: Tailwind CSS.
- Autenticacion: Supabase Auth.
- Base de datos: Supabase Postgres.
- Archivos: Supabase Storage.
- Despliegue: Vercel.
- Escaneo de codigo de barras: ZXing o libreria web equivalente compatible con camara desde navegador.

## 4. Entidades iniciales

Las entidades se describen a nivel conceptual. Este documento no define SQL, migraciones ni codigo ejecutable.

### profiles

Representa los usuarios autorizados de la aplicacion y sus permisos funcionales.

Campos principales sugeridos:

- Identificador interno del perfil.
- Identificador relacionado con Supabase Auth.
- Nombre visible.
- Correo o identificador de acceso.
- Rol: supervisor, segundo_al_mando o tercero_al_mando.
- Estado del usuario: activo o inactivo.
- Fecha de creacion.
- Fecha de ultima actualizacion.

Notas:

- Los asistentes no deben tener perfil de acceso en el MVP.
- El perfil complementa a Supabase Auth; no reemplaza el sistema de autenticacion.
- Los usuarios pueden crearse manualmente al inicio.

### instructions

Representa una instruccion operativa registrada por un usuario autorizado.

Campos principales sugeridos:

- Identificador de la instruccion.
- Fecha y hora de registro generadas por el sistema.
- Responsable operativo de ejecutar o atender la instruccion.
- Texto de la instruccion.
- Prioridad: baja, media, alta o critica.
- Estado: pendiente, en_proceso, cumplida, no_cumplida, requiere_seguimiento o anulada.
- Observaciones.
- Usuario que registra.
- Usuario que actualiza por ultima vez.
- Fecha y hora de ultima actualizacion.

Notas:

- El estado inicial recomendado es pendiente.
- Las observaciones pueden actualizarse para dejar trazabilidad operativa.
- No se incluye firma digital.

### waste_records

Representa un evento de merma registrado en tienda.

Campos principales sugeridos:

- Identificador del registro de merma.
- Fecha y hora de registro generadas por el sistema.
- Codigo de barras capturado por escaneo o entrada manual.
- Producto relacionado, si existe en la base interna.
- Nombre de producto ingresado o mostrado.
- Categoria.
- Cantidad.
- Unidad de medida.
- Motivo de merma: vencido, averia_transporte, dano_manipulacion, dano_cliente, dano_temperatura, perdida_vacio, empaque_roto, producto_contaminado, recuperable_mal_descartado u otro.
- Responsable que deposito el producto.
- Usuario que registra.
- Area o cuadrante.
- Observacion.
- Estado de revision: pendiente_revision, revisado, recuperable, no_recuperable, requiere_seguimiento o anulado.
- Indicador de producto no encontrado.
- Ruta o referencia del archivo de evidencia en Supabase Storage.
- Usuario que revisa o actualiza por ultima vez.
- Fecha y hora de ultima actualizacion.

Notas:

- El estado inicial recomendado es pendiente_revision.
- Si el producto no existe, el registro debe continuar con el codigo capturado y la marca de producto no encontrado.
- Para el MVP se asume una foto principal de evidencia por registro de merma.

### products

Representa la base interna sencilla de productos para resolver codigos de barras en el MVP.

Campos principales sugeridos:

- Identificador del producto.
- Codigo de barras.
- Nombre del producto.
- Categoria.
- Unidad de medida sugerida.
- Estado del producto: activo o inactivo.
- Fuente o nota de carga interna, si aplica.
- Fecha de creacion.
- Fecha de ultima actualizacion.

Notas:

- Esta base no es inventario oficial.
- Puede cargarse manualmente o por archivo simple en una fase posterior.
- Su funcion es ayudar al registro operativo, no certificar existencias ni costos.

### waste_evidence_files

No se recomienda como entidad separada para el MVP inicial.

Justificacion:

- El PRD requiere foto de evidencia para merma, pero no requiere multiples fotos, versionado ni gestion documental avanzada.
- Para reducir complejidad, `waste_records` puede guardar la referencia principal al archivo en Supabase Storage.
- Esta entidad solo deberia agregarse despues si se aprueba soporte para multiples evidencias por registro, reemplazo auditado de archivos o metadatos avanzados por foto.

## 5. Roles y permisos funcionales

Los tres roles usan la aplicacion. No se agregan roles nuevos.

### Supervisor

Puede:

- Crear instrucciones operativas.
- Consultar instrucciones e historial.
- Actualizar estado y observaciones de instrucciones.
- Crear registros de merma.
- Consultar registros de merma.
- Revisar merma y cambiar estado de revision.
- Consultar productos de la base interna.

Uso esperado:

- Usuario principal de control y revision.
- Mayor responsabilidad sobre validacion y seguimiento.

### Segundo al mando

Puede:

- Crear instrucciones operativas cuando este encargado de la operacion.
- Consultar instrucciones e historial.
- Actualizar estado y observaciones de instrucciones.
- Crear registros de merma.
- Consultar registros de merma.
- Cambiar estado de revision de merma cuando este encargado.
- Consultar productos de la base interna.

Uso esperado:

- Operacion diaria y continuidad cuando el supervisor no este disponible.

### Tercero al mando

Puede:

- Crear instrucciones operativas de apoyo.
- Consultar instrucciones e historial.
- Actualizar estado y observaciones de instrucciones bajo seguimiento operativo.
- Crear registros de merma.
- Consultar registros de merma.
- Consultar productos de la base interna.

Restriccion recomendada:

- No deberia anular registros ni cerrar revisiones criticas salvo decision posterior del supervisor.

Uso esperado:

- Apoyo al registro y seguimiento, sin ampliar el uso a asistentes.

## 6. Autenticacion con Supabase Auth

Estrategia conceptual:

- Supabase Auth controla inicio de sesion, cierre de sesion y recuperacion de acceso si se habilita.
- Cada usuario autenticado debe tener un perfil asociado en `profiles`.
- El rol funcional se lee desde `profiles`.
- La aplicacion debe bloquear el acceso si el usuario no tiene perfil activo.
- En el MVP, los usuarios autorizados se pueden crear manualmente.

Reglas esperadas:

- Solo usuarios autenticados y activos acceden a la aplicacion.
- El frontend debe ocultar acciones no permitidas por rol.
- La base de datos debe proteger registros con politicas acordes a usuarios autenticados y roles, definidas en una fase posterior.
- No se deben capturar datos personales sensibles innecesarios.

## 7. Almacenamiento de evidencia con Supabase Storage

Estrategia conceptual:

- Las fotos de evidencia de merma se almacenan en Supabase Storage.
- La base de datos guarda solo la ruta o referencia del archivo, no la imagen.
- La evidencia debe quedar asociada a un `waste_record`.
- El bucket debe ser privado o con acceso restringido a usuarios autenticados autorizados.
- El nombre de archivo debe evitar datos personales y usar un patron estable basado en registro, fecha o identificador tecnico.

Validaciones recomendadas:

- Permitir formatos comunes de imagen del navegador.
- Limitar tamano maximo de archivo en la implementacion.
- Comprimir o redimensionar antes de subir si la experiencia movil se vuelve lenta.
- Permitir reintento si falla la carga.

## 8. Codigos de barras y productos

Flujo esperado:

1. El usuario escanea el codigo con camara o lo escribe manualmente.
2. La aplicacion captura solo el valor del codigo de barras.
3. El sistema busca el codigo en la tabla interna `products`.
4. Si existe, completa nombre, categoria y unidad de medida sugerida.
5. Si no existe, permite continuar el registro de merma con el codigo capturado.
6. El registro queda marcado como producto no encontrado.
7. El usuario completa los campos obligatorios restantes y guarda la merma.

Reglas:

- El escaneo no consulta fuentes corporativas oficiales.
- La base `products` es interna, sencilla y no oficial.
- La falta de producto no debe bloquear el registro.
- El codigo capturado debe guardarse aunque no exista producto relacionado.

## 9. Estructura tecnica esperada de Next.js

La estructura se define a nivel conceptual para la futura fase de preparacion. No se deben crear carpetas en esta tarea.

Carpetas esperadas:

- App y rutas principales.
- Componentes reutilizables de interfaz.
- Componentes especificos de formularios.
- Libreria de cliente Supabase.
- Servicios o acciones de datos por modulo.
- Tipos TypeScript compartidos.
- Utilidades de validacion y formato.
- Estilos globales.

Rutas funcionales esperadas:

- Inicio o redireccion segun autenticacion.
- Login.
- Instrucciones: listado, nuevo registro y detalle/edicion de estado.
- Merma: listado, nuevo registro y detalle/revision.
- Productos: consulta interna simple si se requiere para soporte del flujo de merma.

Modulos esperados:

- Autenticacion y sesion.
- Instrucciones operativas.
- Registro de merma.
- Productos internos.
- Evidencia fotografica.

## 10. Convenciones iniciales

### Nombres

- Usar nombres de entidades en ingles y snake_case para conceptos persistentes.
- Usar nombres de campos consistentes entre frontend y base de datos.
- Usar roles normalizados: supervisor, segundo_al_mando, tercero_al_mando.
- Usar estados normalizados sin tildes ni espacios para persistencia.

### Estados

Estados de instrucciones:

- pendiente.
- en_proceso.
- cumplida.
- no_cumplida.
- requiere_seguimiento.
- anulada.

Estados de merma:

- pendiente_revision.
- revisado.
- recuperable.
- no_recuperable.
- requiere_seguimiento.
- anulado.

Estados de usuario:

- activo.
- inactivo.

### Validaciones

Instrucciones:

- Responsable obligatorio.
- Texto de instruccion obligatorio.
- Prioridad obligatoria.
- Estado obligatorio.
- Fecha, hora y usuario que registra asignados por el sistema.

Merma:

- Codigo de barras obligatorio.
- Cantidad obligatoria y mayor que cero.
- Unidad de medida obligatoria.
- Motivo obligatorio.
- Responsable obligatorio.
- Area o cuadrante obligatorio.
- Estado de revision obligatorio.
- Foto de evidencia requerida si asi se mantiene el criterio operativo del MVP.

Productos:

- Codigo de barras obligatorio y unico dentro de la base interna.
- Nombre obligatorio.
- Categoria recomendada.
- Unidad de medida recomendada.

### Responsive mobile-first

- Disenar primero para ancho de celular.
- Usar botones y campos tactiles con tamanos comodos.
- Evitar tablas densas en movil; preferir listas escaneables.
- Filtros simples y visibles por modulo.
- Estados y prioridades deben distinguirse visualmente sin depender solo del color.
- Formularios largos deben agruparse por bloques claros.

## 11. Criterios minimos para pasar a preparacion web

Se puede pasar a la fase de preparacion del proyecto web cuando:

- El alcance sigue limitado a instrucciones operativas y merma.
- Las entidades conceptuales estan definidas.
- Los roles y permisos funcionales estan acordados.
- La autenticacion se basa en Supabase Auth con perfiles internos.
- Las fotos de evidencia se almacenan en Supabase Storage.
- El flujo de codigo de barras contempla producto encontrado y no encontrado.
- La estructura tecnica esperada de Next.js esta documentada.
- No quedan dependencias con integraciones corporativas ni inventario oficial.

## 12. Riesgos y dudas

- La foto de evidencia puede hacer lento el registro en redes moviles si no se limita el tamano de imagen.
- La base interna de productos puede quedar incompleta; el flujo de producto no encontrado es obligatorio para no frenar la operacion.
- El criterio exacto de quien puede anular registros debe confirmarse antes de implementar politicas de base de datos.
- Si se requiere auditoria detallada de cada cambio de estado, podria necesitarse una entidad historica posterior; no se incluye en el MVP inicial para mantener simplicidad.
