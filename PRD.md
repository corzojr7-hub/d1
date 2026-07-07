# PRD - Sistema de Control Operativo de Tienda

## 1. Resumen

El Sistema de Control Operativo de Tienda es una aplicacion web responsive para registrar y consultar instrucciones operativas y eventos de merma en una tienda retail tipo 2.

El objetivo del MVP es mejorar la trazabilidad operativa sin aumentar demasiado la carga administrativa del equipo de mando de tienda.

## 2. Objetivos del MVP

- Registrar instrucciones operativas con responsable, prioridad, estado y observaciones.
- Registrar merma con producto, motivo, responsable, ubicacion, evidencia y estado de revision.
- Consultar historiales basicos.
- Aplicar filtros simples.
- Mantener una experiencia rapida desde celular.
- Evitar integraciones corporativas y datos sensibles innecesarios.

## 3. Usuarios

### Supervisor

Usuario principal. Registra instrucciones, revisa estados, registra o valida merma y consulta historial.

### Segundo al mando

Registra instrucciones o merma cuando este encargado de la operacion. Puede consultar y actualizar estados.

### Tercero al mando

Apoya el registro operativo y seguimiento de eventos bajo responsabilidad del equipo de mando.

## 4. Modulo de Instrucciones Operativas

### Campos requeridos

- Fecha automatica.
- Hora automatica.
- Persona responsable.
- Instruccion dada.
- Prioridad.
- Estado.
- Observaciones.
- Usuario que registra.

### Estados sugeridos

- Pendiente.
- En proceso.
- Cumplida.
- No cumplida.
- Requiere seguimiento.
- Anulada.

### Prioridades sugeridas

- Baja.
- Media.
- Alta.
- Critica.

### Flujo basico

1. El usuario autorizado abre el formulario de instrucciones.
2. El sistema asigna fecha y hora automaticamente.
3. El usuario selecciona responsable, prioridad y describe la instruccion.
4. El registro queda en estado inicial Pendiente, salvo que el usuario elija otro estado permitido.
5. El usuario puede actualizar el estado y observaciones.
6. El registro queda disponible en historial y filtros.

## 5. Modulo de Registro de Merma

### Campos requeridos

- Fecha automatica.
- Hora automatica.
- Codigo de barras.
- Producto.
- Categoria.
- Cantidad.
- Unidad de medida.
- Motivo de merma.
- Responsable que deposito el producto.
- Usuario que registra.
- Area o cuadrante.
- Observacion.
- Estado de revision.

### Campo condicional

- Foto de evidencia, cuando aplique.

### Motivos sugeridos

- Vencido.
- Averia de transporte.
- Dano por manipulacion.
- Dano por cliente.
- Dano por temperatura.
- Perdida de vacio.
- Empaque roto.
- Producto contaminado.
- Producto recuperable mal descartado.
- Otro.

### Estados sugeridos

- Pendiente de revision.
- Revisado.
- Recuperable.
- No recuperable.
- Requiere seguimiento.
- Anulado.

### Flujo basico

1. El usuario autorizado abre el formulario de merma.
2. El sistema asigna fecha y hora automaticamente.
3. El usuario escanea o escribe el codigo de barras.
4. El sistema busca el producto en una base interna de productos.
5. Si el producto existe, completa nombre, categoria y unidad cuando aplique.
6. Si el producto no existe, permite registrar el codigo y marcar el producto como no encontrado.
7. El usuario completa cantidad, motivo, responsable, area, observacion y foto si aplica.
8. El registro queda en estado Pendiente de revision.
9. El usuario autorizado puede revisar y cambiar estado.

## 6. Producto y codigos de barras

El escaneo con camara solo obtiene el codigo de barras. Para mostrar informacion del producto, el sistema necesita una base interna de productos.

Para el MVP se acepta una base inicial sencilla, no oficial, mantenida internamente para pruebas y operacion local.

## 7. Historial y filtros

El MVP debe permitir consultar registros por:

- Tipo de registro.
- Fecha o rango de fechas.
- Estado.
- Responsable.
- Motivo de merma.
- Prioridad.

Los filtros deben ser simples y pensados para uso rapido desde celular.

## 8. Evidencia fotografica

La evidencia fotografica aplica principalmente a merma. Debe permitir adjuntar o tomar una foto desde el dispositivo cuando el navegador lo permita.

Las fotos deben almacenarse en Supabase Storage o alternativa definida en arquitectura.

## 9. Seguridad y acceso

El MVP debe usar autenticacion para limitar el acceso a usuarios autorizados.

Roles iniciales:

- Supervisor.
- Segundo al mando.
- Tercero al mando.

No se deben capturar datos personales sensibles innecesarios.

## 10. Requisitos no funcionales

- Interfaz responsive con prioridad movil.
- Formularios rapidos y claros.
- Carga razonable en redes moviles.
- Estados visibles.
- Datos persistentes.
- Codigo mantenible.
- Cambios pequenos y verificables.

## 11. Fuera del alcance

- Firma digital.
- Integracion con sistemas oficiales.
- Inventario oficial.
- Aplicacion nativa.
- Dashboards avanzados.
- IA predictiva.
- Gestion de nomina.
- Uso directo por asistentes.

## 12. Suposiciones

- Suposicion: el sistema se usara primero en una sola tienda.
- Suposicion: los usuarios autorizados pueden ser creados manualmente al inicio.
- Suposicion: la base de productos inicial puede cargarse manualmente o por archivo simple.
- Suposicion: el MVP no necesita operar sin internet.

## 13. Arquitectura Inicial (Alto Nivel)

- **Frontend**: Aplicacion web usando Next.js y React.
- **Estilos**: Tailwind CSS para un diseno utilitario y rapido.
- **Autenticacion**: Supabase Auth para restringir el acceso a usuarios autorizados.
- **Base de Datos**: Supabase (PostgreSQL) con tablas relacionales simples (Usuarios, Instrucciones, Merma, Productos).
- **Almacenamiento**: Supabase Storage para alojar fotos de evidencia de merma.
- **Despliegue**: Vercel para alojamiento del frontend web.

## 14. Riesgos y mitigaciones

- **Riesgo**: Baja adopcion en tienda por interfaz compleja.
  - **Mitigacion**: Diseno mobile-first enfocado en minimizar clics y texto a escribir.
- **Riesgo**: Lentitud en la carga de imagenes de evidencia.
  - **Mitigacion**: Usar resoluciones de imagen moderadas y optimizar envio.
- **Riesgo**: Ausencia temporal de internet en tienda.
  - **Mitigacion**: Al no haber offline support en MVP, mostrar alertas claras cuando falle la conexion e invitar a reintentar.
- **Riesgo**: Codigos de barras no encontrados en la base interna.
  - **Mitigacion**: Permitir registro de merma marcando el producto como "no encontrado", habilitando el flujo sin bloquear al usuario.

## 15. Criterios de exito del MVP

- Se puede registrar y consultar instrucciones operativas y eventos de merma de principio a fin sin bloqueos.
- El tiempo para completar un registro de merma es menor a 1-2 minutos en celular.
- La interfaz es evaluada como clara y funcional por los usuarios de prueba.
- El sistema mantiene trazabilidad sin depender de sistemas corporativos oficiales de inventario en esta etapa.
