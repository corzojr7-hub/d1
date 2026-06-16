# ROADMAP - Sistema de Control Operativo de Tienda

## Fase 0 - Gobierno del proyecto

Objetivo: dejar definidos los documentos base, reglas de trabajo, alcance y flujo multi-IA.

Tareas:

- Crear PROJECT_CONTEXT.md.
- Crear PRD.md inicial.
- Crear ROADMAP.md inicial.
- Crear DECISIONS.md inicial.
- Crear CHANGELOG.md.
- Crear NextAx con la primera tarea ejecutable.
- Definir estrategia economica de modelos IA y reglas de escalamiento.

Estado: Completada.

## Fase 1 - Arquitectura inicial

Objetivo: definir la estructura tecnica antes de programar modulos.

Tareas previstas:

- Definir arquitectura funcional y tecnica del MVP.
- Documentar la arquitectura inicial concreta en ARCHITECTURE.md.
- Definir entidades iniciales y relaciones.
- Definir estrategia de autenticacion y roles.
- Definir estrategia de almacenamiento de fotos.
- Definir estrategia para base interna de productos.
- Definir convenciones de carpetas, nombres y calidad.

Estado: Completada.

## Fase 2 - Preparacion del proyecto web

Objetivo: crear la base tecnica de la aplicacion sin implementar logica completa de negocio.

Tareas previstas:

- Inicializar proyecto Next.js con TypeScript.
- Configurar Tailwind CSS.
- Crear estructura base de carpetas.
- Crear layout responsive inicial.
- Configurar linting/formato segun stack elegido.
- Agregar documentacion de ejecucion local.
- Ejecutar tareas pequenas con modelos gratuitos/economicos y escalamiento solo si aplica.

Estado: Completada.

## Estrategia de ejecucion multi-IA

Desde 2026-06-03, el proyecto prioriza modelos gratuitos y economicos para ejecucion.

La IA lider no debe escoger modelos al azar ni depender de OpenCode Go como fuente principal de ejecucion. Debe seleccionar el modelo recomendado en cada NEXT_ACTION segun tipo de tarea, dificultad, riesgo, costo, necesidad de contexto, impacto en arquitectura y posibilidad de romper el proyecto.

Guia base:

- Liderazgo, arquitectura y decisiones criticas: GPT-5.5.
- Revision amplia y contexto largo: Gemini 3.1 Pro Low, Gemini 3.5 Flash High o Gemini 3 Flash Preview.
- Codigo principal: Qwen3 Coder 480B A35B Free; alternativas DeepSeek V4 Flash Free, gpt-oss-120b Free, GLM 4.5 Air Free o Qwen3 Next 80B A3B Instruct Free.
- Frontend/UI: Qwen3 Coder 480B A35B Free, Gemini 3 Flash Preview, MiMo V2.5 Free o DeepSeek V4 Flash Free.
- Backend/Supabase: Qwen3 Coder 480B A35B Free, DeepSeek V4 Flash Free, gpt-oss-120b Free o GLM 4.5 Air Free.
- QA tecnico: Kimi K2.6 Free, Nemotron 3 Super Free o GLM 4.5 Air Free; escalar a GPT-5.4-Mini o Gemini 3.5 Flash High si aplica.
- Documentacion: MiniMax M3 Free, Llama 3.3 70B Instruct Free o Gemini 3.1 Flash Lite Preview.
- Revision critica externa: GLM 4.5 Air Free, Llama 3.3 70B Instruct Free o Gemini 3.5 Flash High.

Cada tarea debe ser pequena, verificable y compatible con modelos gratuitos. Solo se escala a modelos premium cuando existan bloqueos, riesgo tecnico, impacto en seguridad/autenticacion/base de datos/estructura global o decisiones criticas.

Cada NEXT_ACTION debe incluir una seccion "Justificacion del modelo seleccionado" que explique por que se eligio ese modelo, por que no se eligio uno mas caro, que alternativa gratuita usar y cuando escalar a modelo premium.

## Fase 3 - Modelo de datos y Supabase

Objetivo: preparar persistencia, autenticacion y almacenamiento.

Tareas previstas:

- Preparar cliente Supabase y variables de entorno sin implementar autenticacion funcional.
- Crear esquema inicial de tablas.
- Crear politicas de acceso basicas.
- Configurar Supabase Auth.
- Configurar Supabase Storage para evidencias.
- Crear datos semilla para usuarios/roles y productos de prueba.

Estado: En progreso.

## Fase 4 - Modulo de Instrucciones Operativas

Objetivo: implementar registro, consulta y actualizacion de instrucciones.

Tareas previstas:

- Formulario de nueva instruccion.
- Listado de instrucciones.
- Filtros basicos.
- Actualizacion de estado.
- Validaciones.
- Pruebas funcionales.

Estado: Pendiente.

## Fase 5 - Modulo de Merma

Objetivo: implementar registro, consulta y revision de merma.

Tareas previstas:

- Formulario de merma.
- Entrada manual de codigo de barras.
- Escaneo con camara.
- Busqueda en base interna de productos.
- Captura o carga de foto.
- Listado y filtros.
- Actualizacion de estado de revision.
- Pruebas funcionales.

Estado: Pendiente.

## Fase 6 - Historial operativo

Objetivo: facilitar consulta transversal de eventos operativos.

Tareas previstas:

- Vista de historial unificada o separada por modulos.
- Filtros por fecha, responsable y estado.
- Detalle de registro.
- Ajustes de usabilidad movil.

Estado: Pendiente.

## Fase 7 - QA, estabilizacion y despliegue

Objetivo: dejar una version MVP estable para prueba real.

Tareas previstas:

- Revision QA funcional.
- Revision responsive en celular y computador.
- Correccion de bugs.
- Reglas de uso minimo.
- Preparacion para despliegue en Vercel.
- Documentacion de instalacion y uso.

Estado: Pendiente.
