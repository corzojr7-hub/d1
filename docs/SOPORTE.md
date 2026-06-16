# Protocolo de soporte e incidencias - MVP

> Tarea: MVP-073
> Alcance: soporte operativo para tienda, primer nivel de escalamiento y
> canales de incidencia durante la primera semana de uso real.

Este documento es el protocolo de incidencias para la aplicacion en
produccion. Se usa cuando algo no funciona como se espera y la guia de
uso (`docs/USO_MINIMO.md`) no resuelve el problema.

## 1. Quien atiende cada nivel

| Nivel | Quien | Que resuelve | Como contactar |
|-------|-------|--------------|----------------|
| 1 - Tienda | Supervisor del turno | Bloqueos de registro, dudas de uso, primer diagnostico | Directo en tienda |
| 2 - Soporte tecnico | Equipo de administracion tecnica | Login, conexion, catalogo, base de datos, despliegue | Canal definido por el equipo (chat, correo, ticket) |
| 3 - Escalamiento | Responsable del proyecto | Arquitectura, seguridad, cambios de alcance, integraciones | Canal definido por el equipo (correo, reunion) |

Regla: el supervisor de tienda intenta el nivel 1 antes de escalar.
Si el problema es tecnico, recopila los datos de la seccion 3 y
escala al nivel 2 con esos datos completos.

## 2. Tipos de incidencia y primera respuesta

### 2.1 No se puede iniciar sesion (login)

Sintomas:
- La pantalla de login no carga.
- Al escribir usuario y clave, el boton no responde.
- Aparece un mensaje de error rojo tras intentar entrar.

Primera respuesta (supervisor):
1. Verificar que la URL es la correcta y que la conexion a internet
   de la tienda funciona.
2. Verificar que el usuario y la clave fueron entregados por
   administracion tecnica. No intentar registros nuevos.
3. Si el error dice "credenciales invalidas", confirmar que el
   usuario esta activo en la tabla `profiles` de Supabase.
4. Si el error persiste, recopilar datos y escalar al nivel 2.

### 2.2 Un modulo no carga o no responde

Sintomas:
- La pantalla principal carga pero un bloque (IO, MR, HO, CP) queda
  en blanco o con "Cargando..." indefinido.
- Al abrir un formulario, no aparecen los campos.
- Un boton no hace nada al pulsarlo.

Primera respuesta (supervisor):
1. Revisar la conexion a internet. Recargar la pagina (F5 o tirar
   hacia abajo en celular).
2. Si el modulo es el historial (`/history`), verificar que el
   navegador no esta en modo incognito (el historial local vive en
   localStorage y no se ve en modo incognito).
3. Si el problema sigue, capturar el mensaje de error exacto y el
   modulo. Escala al nivel 2 con datos.

### 2.3 El formulario no envia

Sintomas:
- Al pulsar "Registrar", el boton se queda en "Enviando..." sin
  terminar.
- Aparece un mensaje de error rojo debajo de un campo.
- El resumen de exito no aparece.

Primera respuesta (supervisor):
1. Verificar que todos los campos obligatorios estan completos. La
   app muestra el error junto al campo que falta.
2. Si el error dice "Error al registrar" (persistencia), la base
   de datos puede estar caida o el usuario puede no tener permiso.
3. Recargar la pagina y reintentar. Si falla dos veces, escalar al
   nivel 2 con los datos.

### 2.4 El catalogo no muestra un producto

Sintomas:
- Un producto conocido no aparece al buscar por nombre, material o
  codigo de barras.
- El escaner detecta un codigo pero no autocompleta el ID.

Primera respuesta (supervisor):
1. Confirmar que el codigo de barras es correcto comparando con la
   etiqueta del producto.
2. Si el codigo es correcto y no aparece, marcar "Producto no
   encontrado en catalogo" en el formulario de merma y registrar el
   evento de todas formas.
3. Registrar el codigo faltante en una lista para inclusion por
   proceso tecnico.
4. No escalar por un producto faltante; solo si faltan muchos o si
   el catalogo entero no carga.

### 2.5 La evidencia fotografica no se adjunta

Sintomas:
- Al seleccionar una imagen, aparece un error rojo.
- El preview no se muestra.
- La imagen se selecciona pero no aparece en el formulario.

Primera respuesta (supervisor):
1. Verificar que el formato es imagen (JPG, PNG, WebP, GIF, BMP o
   AVIF). El formato se ve en la extension del archivo.
2. En celular, verificar que la camara tiene permiso y que el
   navegador lo permite.
3. Si la imagen es muy pesada, intentar con una foto mas liviana.
4. Si no es posible adjuntar, registrar la merma sin foto. La foto
   es opcional; la observacion escrita es obligatoria.

### 2.6 El historial local desaparece

Sintomas:
- Al recargar la pagina, el historial operativo aparece vacio.
- Las entradas de ayer no se ven hoy.

Primera respuesta (supervisor):
1. Verificar que se esta usando el mismo navegador y el mismo
   dispositivo. El historial local vive en el navegador especifico.
2. Si se cambio de navegador o se limpiaron datos del sitio, el
   historial se perdio. Si la app esta conectada a Supabase, los
   registros estan en la base de datos.
3. Si la app no esta conectada a Supabase, los registros locales se
   pierden al limpiar datos. Avisar al equipo tecnico para que
   conecte la app a Supabase cuanto antes.

### 2.7 La aplicacion no carga en absoluto

Sintomas:
- La URL abre una pagina en blanco o con error 404/500.
- La pantalla principal no aparece.

Primera respuesta (supervisor):
1. Verificar conexion a internet.
2. Probar en otro navegador o dispositivo.
3. Si la URL de Vercel no responde, escalar al nivel 2 inmediatamente.

## 3. Datos obligatorios para reportar una incidencia

Cuando se escala al nivel 2, el supervisor debe incluir estos datos
completos. Sin ellos, el soporte tecnico puede no poder diagnosticar.

- Fecha y hora exacta del incidente (incluir zona horaria).
- URL de la aplicacion (la URL completa que se abrio).
- Modulo afectado (login, IO, MR, HO, CP, o varios).
- Navegador y dispositivo (ej: Chrome en celular Android, Edge en
  computador Windows).
- Usuario o rol que intento la accion (supervisor, segundo, tercero).
- Descripcion paso a paso de lo que se intento y que paso.
- Mensaje de error exacto, si aparecio.
- Captura de pantalla, si es posible.
- Si el problema es nuevo o ya habia pasado antes.

Formato sugerido para el mensaje:

```
[INCIDENCIA] Modulo - Breve descripcion
Fecha/hora:
URL:
Usuario/rol:
Navegador/dispositivo:
Pasos:
1. ...
2. ...
Resultado esperado:
Resultado real:
Mensaje de error:
```

## 4. Escalamiento y tiempos de respuesta

| Severidad | Ejemplo | Tiempo de respuesta nivel 2 | Accion |
|-----------|---------|----------------------------|--------|
| Critica | App no carga, login bloqueado para todos, datos no se guardan | 30 minutos | Nivel 2 responde en 30 min; si no resuelve, escala a nivel 3 en 1 hora |
| Alta | Un modulo no funciona, escaner roto, evidencia no se adjunta | 2 horas | Nivel 2 responde en 2 horas; supervisor documenta workaround |
| Media | Producto faltante en catalogo, historial local perdido | 1 dia laboral | Nivel 2 responde en 1 dia; supervisor usa workaround |
| Baja | Texto confuso, boton pequeno, sugerencia de mejora | 1 semana | Nivel 2 registra para proxima iteracion |

## 5. Workarounds para seguir operando

Mientras se resuelve la incidencia, la tienda puede seguir operando
con estos procedimientos alternativos:

- Si login falla: usar un dispositivo alternativo. Si todos fallan,
  registrar en papel y pasar a digital cuando se restaure.
- Si un formulario no envia: registrar en papel con los mismos datos
  y enviar cuando el modulo vuelva.
- Si el catalogo no carga: registrar el codigo de barras a mano y
  marcar "Producto no encontrado en catalogo".
- Si la evidencia no se adjunta: registrar sin foto. La observacion
  escrita es suficiente.
- Si el historial local desaparece: si esta conectado a Supabase,
  consultar directamente en la base de datos. Si no, reconstruir
  desde los registros en papel.
- Si la app no carga: registrar en papel. No esperar a la app para
  documentar un evento de merma.

## 6. Canales de soporte

Este apartado se completa con los canales reales del equipo:

- Nivel 2 (soporte tecnico): _____________________________
- Nivel 3 (escalamiento): ________________________________
- Grupo de emergencia (incidencias criticas): _____________
- Horario de atencion: ___________________________________

## 7. Version de este protocolo

- Version: MVP-073
- Fecha: 2026-06-05
- Aplicacion: Sistema de Control Operativo de Tienda
- Repositorio: ver README.md

Si la aplicacion cambia de version o se agregan modulos, actualizar
este protocolo y comunicar a la tienda la nueva version.
