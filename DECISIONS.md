# DECISIONS - Sistema de Control Operativo de Tienda

## DEC-001 - Producto como sistema operativo, no app aislada de merma

Fecha: 2026-06-02

Decision: el proyecto se tratara como Sistema de Control Operativo de Tienda, no solo como bitacora ni solo como app de merma.

Motivo: las instrucciones operativas y la merma comparten el mismo problema de fondo: falta de trazabilidad.

## DEC-002 - MVP con dos modulos principales

Fecha: 2026-06-02

Decision: el MVP se enfocara en Instrucciones Operativas y Registro de Merma.

Motivo: ambos modulos atacan problemas reales y urgentes de operacion, manteniendo el alcance controlado.

## DEC-003 - Asistentes fuera del MVP

Fecha: 2026-06-02

Decision: los asistentes no usaran la aplicacion en la primera version.

Motivo: reducir complejidad operativa, resistencia de adopcion y necesidades de permisos.

## DEC-004 - Sin firma digital en MVP

Fecha: 2026-06-02

Decision: no se incluira firma digital por ahora.

Motivo: no es necesaria para validar el aprendizaje inicial del producto y aumentaria complejidad.

## DEC-005 - Sin integracion corporativa

Fecha: 2026-06-02

Decision: el MVP no se integrara con sistemas oficiales de 2.

Motivo: evitar dependencia externa, riesgos de permisos y exposicion de informacion sensible.

## DEC-006 - Web responsive primero

Fecha: 2026-06-02

Decision: la aplicacion sera web responsive, priorizando celular.

Motivo: el uso esperado ocurre en tienda, donde el celular es el dispositivo mas probable.

## DEC-007 - Escaneo requiere base interna de productos

Fecha: 2026-06-02

Decision: el escaneo de codigo de barras solo capturara el codigo; la informacion del producto vendra de una base interna.

Motivo: la camara no conoce el producto por si sola. El sistema necesita relacionar codigo con datos internos.

## DEC-008 - Trabajo multi-IA controlado por NextAx

Fecha: 2026-06-02

Decision: el desarrollo se guiara con tareas pequenas en NextAx, revisadas por la IA lider antes de avanzar.

Motivo: avanzar rapido con control, reduciendo cambios grandes, inventos de alcance y errores acumulados.

## DEC-009 - Inclusion de Arquitectura, Riesgos y Exito en el PRD

Fecha: 2026-06-02

Decision: Se agregan secciones de arquitectura inicial de alto nivel, riesgos y mitigaciones, y criterios de exito directamente en el PRD.

Motivo: Fortalecer la base documental, alinear las expectativas del MVP-001 y tener metricas claras antes de iniciar la preparacion del proyecto web.

## DEC-010 - Politica inteligente de seleccion de modelos IA

Fecha: 2026-06-03

Decision: el proyecto priorizara modelos gratuitos y economicos para ejecucion, manteniendo GPT-5.5 como IA lider para arquitectura, roadmap, decisiones criticas, creacion de NextAx y revision final. La IA lider podra recomendar modelos tarea por tarea, pero debera justificar cada seleccion segun costo, calidad, riesgo y tipo de tarea.

Motivo: OpenCode Go esta cerca de agotarse y el proyecto necesita mantener avance rapido con control de costo sin perder calidad. Una politica flexible permite elegir modelos gratuitos/economicos cuando el riesgo es bajo y escalar a modelos premium solo cuando el impacto o bloqueo lo justifique.

Reglas principales:

- La seleccion debe considerar tipo de tarea, dificultad, riesgo, costo, contexto, impacto sobre arquitectura y posibilidad de romper el proyecto.
- Cada NEXT_ACTION debe incluir la seccion "Justificacion del modelo seleccionado".
- Para codigo, el modelo base sugerido es Qwen3 Coder 480B A35B Free, con alternativas gratuitas segun disponibilidad.
- Para QA tecnico, se sugieren Kimi K2.6 Free, Nemotron 3 Super Free o GLM 4.5 Air Free.
- Para documentacion, se sugieren MiniMax M3 Free, Llama 3.3 70B Instruct Free o Gemini 3.1 Flash Lite Preview.
- Para revision critica externa, se sugieren GLM 4.5 Air Free, Llama 3.3 70B Instruct Free o Gemini 3.5 Flash High.
- Para revision amplia, se sugieren Gemini 3.1 Pro Low, Gemini 3.5 Flash High o Gemini 3 Flash Preview.
- Escalar a GPT-5.5 solo por decisiones arquitectonicas, seguridad, autenticacion, base de datos, estructura global, conflicto entre modelos o dos fallos consecutivos de modelos gratuitos.
- Escalar a GPT-5.4-Mini por bugs persistentes, bloqueo tecnico o mala comprension de una tarea por el modelo gratuito.
- Escalar a Gemini 3.5 Flash High o Gemini 3.1 Pro Low para contexto largo, validacion documental extensa o segunda opinion de roadmap.

## DEC-011 - Evidencia fotografica condicional y observacion requerida en merma

Fecha: 2026-06-03

Decision: en el registro de merma, la observacion sera un campo requerido del MVP y la foto de evidencia sera condicional, obligatoria solo cuando aplique segun el caso operativo y las posibilidades del dispositivo/navegador.

Motivo: el PRD tenia una ambiguedad entre "foto de evidencia" como campo requerido y "foto si aplica" en el flujo. Para mantener rapidez en tienda y evitar bloquear registros cuando la foto no sea viable, la evidencia fotografica queda condicional. La observacion se mantiene requerida para conservar trazabilidad minima del evento.

## DEC-012 - Sin encargatura tecnica ni administracion de productos desde app en MVP

Fecha: 2026-06-03

Decision: el MVP no modelara tecnicamente la "encargatura" del segundo al mando. Mientras no exista una entidad o regla verificable de turno/encargatura, las acciones criticas quedaran reservadas al rol `supervisor`: anulacion de instrucciones, anulacion de merma y cierre de estados criticos de merma (`revisado`, `recuperable`, `no_recuperable`, `anulado`). El segundo al mando y tercero al mando podran registrar y hacer seguimiento operativo segun permisos, pero no cerrar/anular estados criticos mediante RLS.

Decision adicional: la administracion de productos internos no se implementara desde la app en el MVP inicial. La base `products` se cargara o ajustara por proceso tecnico/manual controlado hasta que se apruebe una tarea especifica para administracion de productos.

Motivo: modelar encargatura requiere datos de turnos o delegacion formal y aumentaria complejidad. Permitir productos editables desde la app tambien abre riesgos de calidad de datos. Para mantener seguridad y simplicidad, el MVP prioriza registro y consulta operativa, reservando acciones criticas y mantenimiento de datos maestros para procesos controlados.
