# Guia de uso minimo y arranque rapido - MVP

> Tarea: MVP-048
> Modulos cubiertos: Instrucciones Operativas, Registro de Merma.
> Roles habilitados en el MVP: supervisor, segundo al mando, tercero al mando.
> Los asistentes NO usan la aplicacion en el MVP (fuera de alcance por diseno).

Esta guia explica como usar la aplicacion en tienda, sin entrar en detalle
tecnico. Esta pensada para celular primero, con apoyo en computador cuando
sea necesario. Si algo no funciona como se describe aqui, hablar con el
supervisor antes de cambiar el flujo.

## 1. Quien usa la app y quien no

- Quien usa la app:
  - Supervisor.
  - Segundo al mando.
  - Tercero al mando.
- Quien NO usa la app:
  - Asistentes. En el MVP los asistentes no tienen perfil ni acceso a la
    aplicacion. Si alguien con rol de asistente necesita consultar o registrar
    algo, debe pedirlo a un supervisor, segundo o tercero al mando.
- Quien administra productos:
  - Nadie desde la app en el MVP. El catalogo de productos internos se carga
    y se ajusta por proceso tecnico o manual controlado. Si un producto falta,
    ver seccion 6.
- Quien crea usuarios y perfiles:
  - Administracion tecnica, nunca la app misma.

## 2. Arranque rapido (5 pasos)

1. Abrir la aplicacion en el navegador del celular o del computador de tienda.
   La direccion es la misma en ambos casos; el diseno se adapta al tamano
   de la pantalla.
2. Iniciar sesion con el usuario y la clave entregados por administracion
   tecnica. Si no se puede entrar, no intentar registros por cuenta propia;
   avisar al supervisor.
3. En la pantalla principal aparecen cuatro bloques:
   - Instrucciones Operativas (IO).
   - Registro de Merma (MR).
   - Historial Operativo (HO).
   - Catalogo de Productos (CP).
4. Elegir el bloque segun lo que se necesite registrar o consultar. Para
   registrar, abrir IO o MR; para consultar, abrir HO o el modulo
   correspondiente.
5. Al terminar un registro, revisar el resumen que muestra la aplicacion
   antes de cerrar. Si falta un dato, corregirlo en el mismo formulario
   antes de enviar de nuevo.

## 3. Cuando usar Instrucciones Operativas

- Usar IO para dejar por escrito una indicacion operativa del equipo de
  mando: una tarea, una prioridad, un responsable, una observacion.
- Usar IO tambien para dar seguimiento a una instruccion ya creada: marcar
  en proceso, cumplida, no cumplida o requiere seguimiento.
- No usar IO para registrar merma. La merma tiene su propio modulo.
- Estados posibles que veras en pantalla para una instruccion:
  pendiente, en proceso, cumplida, no cumplida, requiere seguimiento y
  anulada. El estado inicial de toda instruccion nueva es pendiente.
- Prioridades posibles: baja, media, alta, critica.
- Quien puede anular una instruccion:
  - Solo el supervisor. El segundo y el tercero al mando pueden registrar
    y dar seguimiento, pero no pueden anular. Esto es intencional y se
    respeta tambien a nivel de base de datos.

## 4. Cuando usar Registro de Merma

- Usar MR cada vez que se descarte, se recupere o se pierda un producto
  en tienda: vencido, dano de transporte, dano de manipulacion, dano del
  cliente, dano de temperatura, perdida de vacio, empaque roto, producto
  contaminado, recuperable mal descartado u otro motivo valido.
- El formulario exige como minimo:
  - Codigo de barras.
  - Cantidad (siempre mayor que cero).
  - Unidad.
  - Motivo (catalogo cerrado).
  - Responsable.
  - Area.
  - Observacion (texto libre, obligatoria).
- Estado inicial de toda merma nueva: pendiente de revision.
- Estados de revision que veras: pendiente de revision, revisado,
  recuperable, no recuperable, requiere seguimiento, anulado.
- Quien puede cerrar o anular una merma:
  - Solo el supervisor puede mover una merma a revisado, recuperable,
    no recuperable o anulado. El segundo y el tercero al mando solo
    pueden dejarla en pendiente de revision o en requiere seguimiento.
- Evidencia fotografica: opcional. Si el caso lo permite, adjuntar una
  foto ayuda a la revision. Si el dispositivo o la situacion lo impiden,
  se puede registrar sin foto, siempre con la observacion escrita.

## 5. Codigo de barras, catalogo y producto no encontrado

- El modulo de merma espera un codigo de barras. Para capturarlo se puede:
  - Escribirlo a mano.
  - Usar el boton "Catalogo" para buscarlo por nombre o categoria y
    copiar su ID y su codigo.
  - Usar el boton "Escanear" si el celular tiene camara y el navegador
    soporta el escaneo. Al detectar un codigo, se rellena el campo
    automaticamente.
- Si el codigo escrito o escaneado coincide con un producto del catalogo
  local, el ID de producto se rellena solo.
- Si el codigo escrito o escaneado NO coincide con ningun producto del
  catalogo, el formulario limpia el ID y permite marcar "Producto no
  encontrado en catalogo" para dejar constancia del codigo capturado.
- Si el codigo se cambia manualmente a otro distinto despues de un
  autocompletado, el ID de producto se ajusta: se rellena si el nuevo
  codigo existe, y se limpia si ya no existe.
- Importante: barcode y producto siempre deben quedar coherentes. Si
  dudas, abrir el catalogo desde la pantalla principal para verificar
  antes de enviar.

## 6. Que hacer si falta un producto en el catalogo

- Confirmar primero que el codigo de barras es correcto. Compararlo con
  la etiqueta del producto.
- Si el codigo es correcto y aun asi no aparece:
  - Marcar "Producto no encontrado en catalogo" en el formulario de
    merma.
  - Capturar el codigo de barras a mano, junto con la cantidad, unidad,
    motivo, responsable, area y observacion.
  - Registrar la merma de todas formas. Es preferible un registro con
    producto no encontrado a un registro perdido.
- La inclusion o correccion de productos en el catalogo NO se hace desde
  la app. Se hace por proceso tecnico o manual controlado, fuera de la
  aplicacion.
- Si un producto se escanea con frecuencia y nunca aparece, avisar al
  supervisor para que gestione su inclusion en el catalogo.

## 7. Evidencia fotografica

- La foto de evidencia es opcional. Adjuntarla cuando el caso lo permita
  ayuda a la revision posterior.
- Formatos aceptados por el formulario: imagenes JPG, PNG, WebP, GIF,
  BMP o AVIF. Si el archivo no es una imagen valida, la aplicacion
  mostrara un error claro y no adjuntara nada.
- En celular se puede tomar la foto al momento (camara trasera) o elegir
  una imagen ya guardada en el dispositivo. En computador se puede elegir
  un archivo desde el sistema.
- Si no es posible adjuntar foto, registrar la merma solo con la
  observacion escrita. La observacion es el unico campo obligatorio
  relacionado con la trazabilidad del evento.
- La foto se conserva solo de forma local en el navegador mientras el
  MVP no este conectado a la base. Al limpiar el navegador se pierde la
  foto, pero el registro de merma (sin la imagen) se mantiene en el
  historial local de la aplicacion.

## 8. Que hacer y que no hacer (resumen operativo)

- Hacer:
  - Registrar las instrucciones en el momento, no al final del turno.
  - Registrar la merma el mismo dia en que ocurre.
  - Escribir una observacion clara y breve en cada merma.
  - Consultar el Historial Operativo antes de crear un registro, para
    evitar duplicados.
  - Avisar al supervisor cuando una accion critica (anulacion, cierre
    de merma) bloquee el avance operativo.
- No hacer:
  - No compartir la clave de acceso con otras personas.
  - No crear usuarios ni perfiles desde la app.
  - No modificar productos del catalogo desde la app.
  - No anular instrucciones ni cerrar merma como supervisor si el rol
    no es supervisor; eso lo decide el supervisor del turno.
  - No usar la app para datos que no sean del modulo de tienda o de
    merma.
  - No eliminar registros desde la app: si algo esta mal, se anula o
    se corrige, no se borra.

## 9. Recomendaciones practicas por dispositivo

- En celular:
  - Usar el navegador recomendado por la tienda (Chrome o el que
    indique administracion tecnica).
  - Activar la camara solo cuando se vaya a escanear o a adjuntar
    evidencia, para no gastar bateria.
  - Mantener el celular cargado durante el turno. Si la bateria es
    baja, hacer los registros con texto y dejar la foto para despues.
  - No usar la aplicacion con datos moviles personales si la tienda
    tiene WiFi propio: usar la red de la tienda.
  - Cerrar sesion al final del turno si el celular no es personal.
- En computador:
  - Usar un navegador actualizado (Chrome, Edge o Firefox recientes).
  - Aprovechar el Historial Operativo para filtrar por responsable,
    estado, fecha o texto. Esto evita recorrer todas las entradas
    una por una.
  - Para cargar catalogos, el computador suele ser mas comodo porque
    permite copiar y pegar codigos con teclado.
  - Si el computador es compartido, cerrar sesion al terminar.

## 10. Solucion de problemas rapidos (troubleshooting)

Esta seccion cubre los problemas mas comunes en uso diario. Si un
problema no se resuelve con estos pasos, seguir el protocolo de soporte
en `docs/SOPORTE.md`.

### 10.1 La aplicacion no carga

1. Revisar la conexion a internet de la tienda.
2. Probar la URL en otro navegador o dispositivo.
3. Si sigue sin cargar, registrar la hora, el dispositivo y la URL, y
   avisar al supervisor para que escale a soporte tecnico.

### 10.2 El formulario no envia

1. Revisar que todos los campos obligatorios esten completos. La app
   muestra el error junto al campo que falta.
2. Si el boton se queda en "Enviando..." por mas de 10 segundos,
   recargar la pagina y reintentar.
3. Si falla dos veces, registrar el evento en papel y avisar al
   supervisor.

### 10.3 El historial local aparece vacio

1. Verificar que se usa el mismo navegador y dispositivo de siempre.
   El historial local vive en el navegador especifico.
2. Si se cambio de dispositivo o se limpiaron datos del sitio, el
   historial local se perdio. Si la app esta conectada a Supabase, los
   registros estan en la base de datos.
3. Si no esta conectada a Supabase, los registros locales se pierden al
   limpiar datos. Avisar al supervisor para que gestione la conexion.

### 10.4 El escaner de codigo de barras no funciona

1. Confirmar que el celular tiene camara y que el navegador permite
   el acceso.
2. Si el navegador no soporta el escaner, capturar el codigo a mano
   o usar el boton "Catalogo" para buscarlo.
3. El escaner es una ayuda, no es obligatorio.

### 10.5 La foto de evidencia no se adjunta

1. Verificar que el archivo es una imagen (JPG, PNG, WebP, GIF, BMP o
   AVIF).
2. Si el archivo es muy pesado, intentar con una foto mas liviana.
3. Si no es posible adjuntar, registrar la merma sin foto. La
   observacion escrita es obligatoria y suficiente.

### 10.6 Si el problema persiste

- Registrar la situacion con fecha, hora, modulo, navegador y que se
  intento hacer.
- Seguir el protocolo de soporte en `docs/SOPORTE.md` para saber a
  quien escalar y con que datos.
- Mientras se resuelve, usar los workarounds del protocolo de soporte
  para no detener la operacion.
