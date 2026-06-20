export const ACTA_PREFIX = "[ACTA:";

export type ActaTemplateKey =
  | "general"
  | "llegadas_tarde"
  | "productos_vencidos"
  | "ausencias_injustificadas"
  | "destruccion_productos"
  | "bajo_rendimiento_impulso_pos"
  | "bajo_rendimiento_productividad_pos"
  | "mermas";

export type ActaTemplate = {
  key: ActaTemplateKey;
  title: string;
  subtitle: string;
  responsibility: string;
  commitment: string;
};

export const ACTA_TEMPLATES: ActaTemplate[] = [
  {
    key: "general",
    title: "Acta de compromiso",
    subtitle: "Acta general de compromiso",
    responsibility:
      "La presente reunión se realiza en atención a incumplimientos detectados frente a las responsabilidades del cargo y las obligaciones laborales asignadas. Se deja constancia del llamado preventivo para corregir la situación y evitar que vuelva a repetirse.",
    commitment:
      "Se adquiere el compromiso de mejorar el desempeño, cumplir las obligaciones laborales de forma continua, responsable y eficiente, e informar de inmediato cualquier novedad que impida atender adecuadamente las funciones asignadas.",
  },
  {
    key: "llegadas_tarde",
    title: "Acta de compromiso - llegadas tarde",
    subtitle: "Llegadas tarde",
    responsibility:
      "Dentro de las responsabilidades del cargo está presentarse puntualmente al turno asignado y permanecer disponible durante toda la jornada laboral. Los retardos afectan la operación, la organización del equipo y el servicio al cliente.",
    commitment:
      "Se adquiere el compromiso de presentarse a trabajar a la hora de inicio asignada, informar de manera inmediata cualquier novedad justificable y evitar nuevos retrasos en el ingreso a la jornada.",
  },
  {
    key: "productos_vencidos",
    title: "Acta de compromiso - productos vencidos y/o próximos a vencimiento",
    subtitle: "Productos vencidos y/o próximos a vencimiento",
    responsibility:
      "Dentro de las responsabilidades del cargo está garantizar que no permanezcan exhibidos productos vencidos o con fecha próxima a vencerse sin el manejo oportuno, asegurando una adecuada revisión FEFO y retiro preventivo.",
    commitment:
      "Se adquiere el compromiso de retirar oportunamente productos vencidos y/o próximos a vencerse, informar a supervisión cualquier novedad y reforzar la rotación adecuada en el punto de venta.",
  },
  {
    key: "ausencias_injustificadas",
    title: "Acta de compromiso - ausencias injustificadas",
    subtitle: "Ausencias injustificadas",
    responsibility:
      "Dentro de las responsabilidades del cargo está asistir a los turnos asignados y no faltar al trabajo sin justa causa o sin aviso oportuno. Las ausencias injustificadas generan afectación directa sobre la operación y la cobertura del equipo.",
    commitment:
      "Se adquiere el compromiso de presentarse a trabajar todos los días asignados, informar de manera inmediata cualquier situación de fuerza mayor y evitar nuevas ausencias injustificadas.",
  },
  {
    key: "destruccion_productos",
    title: "Acta de compromiso - destrucción de productos",
    subtitle: "Destrucción de productos",
    responsibility:
      "Dentro de las responsabilidades del cargo está garantizar que los productos no aptos para consumo humano sean destruidos conforme al procedimiento establecido, sin permanecer almacenados o en circulación por fuera del control definido.",
    commitment:
      "Se adquiere el compromiso de asegurar el adecuado proceso de destrucción de productos, cumplir los lineamientos internos y reportar de inmediato cualquier novedad relacionada con este procedimiento.",
  },
  {
    key: "bajo_rendimiento_impulso_pos",
    title: "Acta de compromiso - bajo rendimiento impulso en POS",
    subtitle: "Bajo rendimiento impulso en POS",
    responsibility:
      "Dentro de las responsabilidades del cargo está impulsar activamente la venta adicional al cliente en el punto de pago, maximizando las oportunidades de incremento del ticket promedio y el cumplimiento de la meta diaria de impulso.",
    commitment:
      "Se adquiere el compromiso de fortalecer el impulso de productos adicionales durante el proceso de pago, ofrecerlos de manera consistente y reportar oportunamente cualquier situación que afecte ese resultado.",
  },
  {
    key: "bajo_rendimiento_productividad_pos",
    title: "Acta de compromiso - bajo rendimiento productividad POS",
    subtitle: "Bajo rendimiento productividad POS",
    responsibility:
      "Dentro de las responsabilidades del cargo está garantizar un nivel adecuado de productividad en el punto de pago, evitando tiempos prolongados de atención al cliente que afecten la eficiencia operativa y la satisfacción del servicio.",
    commitment:
      "Se adquiere el compromiso de mejorar la productividad en POS, mantener un flujo de atención continuo y eficiente e informar de inmediato cualquier novedad que limite el cumplimiento esperado.",
  },
  {
    key: "mermas",
    title: "Acta de compromiso - mermas",
    subtitle: "Mermas",
    responsibility:
      "Dentro de las responsabilidades del cargo está garantizar la menor pérdida de producto posible, contribuyendo al control de merma y evitando superar el porcentaje esperado para la tienda.",
    commitment:
      "Se adquiere el compromiso de evitar pérdidas de producto por encima del objetivo definido, reforzar los controles preventivos e informar cualquier causa que pueda elevar la merma en la operación.",
  },
];

export function buildActaReason(key: ActaTemplateKey) {
  const template = ACTA_TEMPLATES.find((item) => item.key === key);
  return template ? `${ACTA_PREFIX}${key}] ${template.subtitle}` : "";
}

export function parseActaReason(reason: string | null | undefined) {
  if (!reason?.startsWith(ACTA_PREFIX)) return null;

  const endIndex = reason.indexOf("]");
  if (endIndex === -1) return null;

  const key = reason.slice(ACTA_PREFIX.length, endIndex) as ActaTemplateKey;
  const template = ACTA_TEMPLATES.find((item) => item.key === key);

  return template
    ? {
        key,
        cleanReason: reason.slice(endIndex + 1).trim() || template.subtitle,
        template,
      }
    : null;
}
