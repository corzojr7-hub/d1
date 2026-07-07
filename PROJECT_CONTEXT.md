# Sistema de Control Operativo de Tienda

## Contexto general

El proyecto busca crear una aplicacion web responsive para apoyar la trazabilidad operativa en una tienda retail tipo 2 en Colombia.

El usuario principal es un supervisor con experiencia operativa real en tienda y conocimiento directo de los flujos diarios, presiones de control, comunicacion verbal, seguimiento de tareas y manejo de merma.

## Problema principal

Actualmente muchas instrucciones operativas se comunican verbalmente y varios eventos de merma no quedan registrados con suficiente soporte. Esto dificulta saber que se ordeno, quien era responsable, cuando se asigno, si se ejecuto, que resultado tuvo y si una perdida pudo prevenirse con seguimiento oportuno.

La merma y las instrucciones operativas se entienden como partes de un mismo problema: falta de trazabilidad operativa.

## Vision del producto

Construir un Sistema de Control Operativo de Tienda que permita registrar, consultar y revisar eventos operativos clave, empezando por dos modulos:

1. Instrucciones Operativas.
2. Registro de Merma.

El sistema debe ser simple, rapido y util en tienda, priorizando uso desde celular y manteniendo compatibilidad con computador.

## Usuarios del MVP

La primera version sera usada solo por:

- Supervisor.
- Segundo al mando.
- Tercero al mando.

Los asistentes no usaran la aplicacion en el MVP.

## Alcance inicial

El MVP debe permitir:

- Registrar instrucciones operativas.
- Registrar eventos de merma.
- Consultar historial basico.
- Filtrar registros de forma simple.
- Adjuntar evidencia fotografica cuando aplique.
- Manejar estados de seguimiento.

## Fuera del alcance inicial

No se incluira en el MVP:

- Firma digital.
- Uso por asistentes.
- Integracion con sistemas corporativos de 2.
- Aplicacion movil nativa.
- Publicacion en Play Store.
- Nomina.
- Inventario oficial.
- Informacion financiera sensible.
- IA predictiva.
- Dashboards avanzados.

## Stack sugerido

- Next.js.
- TypeScript.
- Tailwind CSS.
- Supabase.
- Supabase Auth.
- Supabase Storage.
- Vercel.
- ZXing o libreria equivalente para escaneo de codigos de barras desde camara.

## Principios de trabajo

- MVP pequeno y verificable.
- Tareas pequenas, controladas y aprobadas una por una.
- No avanzar a codigo de modulos hasta definir PRD, roadmap y arquitectura inicial.
- Evitar datos sensibles innecesarios.
- Priorizar utilidad real en tienda.
- Mantener cada cambio funcionando.

## Estrategia actual de modelos IA

El proyecto priorizara modelos gratuitos y economicos para ejecucion, dejando los modelos premium para liderazgo, decisiones criticas o rescate.

La estrategia no es una tabla fija. La IA lider debe seleccionar el modelo tarea por tarea segun costo, calidad, riesgo, dificultad, necesidad de contexto, impacto sobre arquitectura y posibilidad de romper el proyecto.

### Politica de seleccion

Cada NEXT_ACTION debe justificar el modelo recomendado segun:

- Tipo de tarea.
- Dificultad.
- Riesgo tecnico.
- Costo.
- Necesidad de contexto.
- Impacto sobre arquitectura.
- Posibilidad de romper el proyecto.

Como se priorizan modelos gratuitos, las tareas ejecutoras deben ser pequenas y controladas:

- Maximo una responsabilidad principal.
- No modificar mas de 3 a 5 archivos salvo autorizacion explicita.
- No inventar funcionalidades.
- No cambiar arquitectura sin aprobacion.
- No tocar autenticacion, base de datos o configuracion global si la tarea no lo pide.
- Entregar resumen de cambios.
- Entregar lista de archivos modificados.
- Entregar pruebas realizadas.
- Entregar riesgos o dudas encontradas.

### IA lider

Modelo principal:

- GPT-5.5.

Uso:

- PRD.
- Roadmap.
- Arquitectura.
- Decisiones criticas.
- Creacion de tareas NextAx.
- Revision final de resultados.
- Aprobacion o solicitud de correcciones.

Regla: no usar GPT-5.5 para escribir codigo simple. Debe usarse para pensar, dirigir y revisar.

### Revision amplia y planificacion larga

Modelo principal:

- Gemini 3.1 Pro Low.

Modelos alternativos:

- Gemini 3.5 Flash High.
- Gemini 3 Flash Preview.

### Codigo principal

Modelo principal:

- Qwen3 Coder 480B A35B Free.

Modelos alternativos:

- DeepSeek V4 Flash Free.
- GLM 4.5 Air Free.
- gpt-oss-120b Free.
- Qwen3 Next 80B A3B Instruct Free.

### Frontend y UI

Modelo principal:

- Qwen3 Coder 480B A35B Free.

Modelos alternativos:

- Gemini 3 Flash Preview.
- MiMo V2.5 Free.
- DeepSeek V4 Flash Free.

### Backend, logica y Supabase

Modelo principal:

- Qwen3 Coder 480B A35B Free.

Modelos alternativos:

- DeepSeek V4 Flash Free.
- gpt-oss-120b Free.
- GLM 4.5 Air Free.

### QA tecnico y revision de bugs

Modelo principal:

- Kimi K2.6 Free.

Modelos alternativos:

- Nemotron 3 Super Free.
- GLM 4.5 Air Free.
- GPT-5.4-Mini si el problema es critico.

### Documentacion

Modelo principal:

- MiniMax M3 Free.

Modelos alternativos:

- Llama 3.3 70B Instruct Free.
- Gemini 3.1 Flash Lite Preview.
- GPT-5.4-Mini si es documentacion critica.

### Revisor critico externo

Modelo principal:

- GLM 4.5 Air Free.

Modelos alternativos:

- Llama 3.3 70B Instruct Free.
- Gemini 3.5 Flash High.

### Modelos que no deben usarse como principales

Evitar como modelos principales de desarrollo:

- Uncensored Free.
- LFM2.5-1.2B-Instruct.
- LFM2.5-1.2B-Thinking.
- Llama 3.2 3B Instruct.
- Nemotron Nano 9B V2.
- Nemotron Nano 12B 2 VL.
- Modelos Nano pequenos.

Solo deben usarse para tareas simples, resumenes menores o pruebas no criticas.

### Reglas de escalamiento

Escalar a GPT-5.5 solo si:

- Hay una decision arquitectonica importante.
- Hay riesgo de romper el proyecto.
- Hay conflicto entre modelos.
- La tarea afecta seguridad, autenticacion, base de datos o estructura global.
- Dos modelos gratuitos fallaron en la misma tarea.

Escalar a GPT-5.4-Mini si:

- El codigo tiene bugs persistentes.
- El modelo gratuito no entiende la tarea.
- Hay errores tecnicos que bloquean avance.

Escalar a Gemini 3.5 Flash High o Gemini 3.1 Pro Low si:

- Se necesita revisar mucho contexto.
- Se necesita validar documentacion extensa.
- Se necesita una segunda opinion de roadmap.

Cada NEXT_ACTION debe incluir modelo recomendado, modelo alternativo gratuito, criterio de escalamiento, archivos permitidos, archivos prohibidos, criterios de aceptacion, pruebas requeridas, que no debe hacer la IA ejecutora y la seccion obligatoria "Justificacion del modelo seleccionado".

La seccion "Justificacion del modelo seleccionado" debe responder:

1. Por que se escogio ese modelo.
2. Por que no se escogio un modelo mas caro.
3. Que modelo alternativo se puede usar si falla.
4. Cuando se debe escalar a un modelo premium.
