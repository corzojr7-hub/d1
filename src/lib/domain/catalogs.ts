import type {
  InstructionPriority,
  InstructionStatus,
  ProfileRole,
  ProfileStatus,
  ProductStatus,
  WasteReason,
  WasteReviewStatus,
} from "./types";

export interface CatalogItem<T extends string> {
  value: T;
  label: string;
}

export const PROFILE_ROLES: CatalogItem<ProfileRole>[] = [
  { value: "supervisor", label: "Supervisor" },
  { value: "segundo_al_mando", label: "Segundo al mando" },
  { value: "tercero_al_mando", label: "Tercero al mando" },
];

export const PROFILE_STATUSES: CatalogItem<ProfileStatus>[] = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export const PRODUCT_STATUSES: CatalogItem<ProductStatus>[] = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export const INSTRUCTION_PRIORITIES: CatalogItem<InstructionPriority>[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Critica" },
];

export const INSTRUCTION_STATUSES: CatalogItem<InstructionStatus>[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "cumplida", label: "Cumplida" },
  { value: "no_cumplida", label: "No cumplida" },
  { value: "requiere_seguimiento", label: "Requiere seguimiento" },
  { value: "anulada", label: "Anulada" },
];

export const WASTE_REASONS: CatalogItem<WasteReason>[] = [
  { value: "vencido", label: "Vencido" },
  { value: "averia_transporte", label: "Averia de transporte" },
  { value: "dano_manipulacion", label: "Daño por manipulacion" },
  { value: "dano_cliente", label: "Daño por cliente" },
  { value: "dano_temperatura", label: "Daño por temperatura" },
  { value: "perdida_vacio", label: "Perdida de vacio" },
  { value: "empaque_roto", label: "Empaque roto" },
  { value: "producto_contaminado", label: "Producto contaminado" },
  {
    value: "recuperable_mal_descartado",
    label: "Producto recuperable mal descartado",
  },
  { value: "reporte_calidad", label: "Reporte de Calidad" },
  { value: "otro", label: "Otro" },
];

export const WASTE_REVIEW_STATUSES: CatalogItem<WasteReviewStatus>[] = [
  { value: "pendiente_revision", label: "Pendiente de revision" },
  { value: "revisado", label: "Revisado" },
  { value: "recuperable", label: "Recuperable" },
  { value: "no_recuperable", label: "No recuperable" },
  { value: "requiere_seguimiento", label: "Requiere seguimiento" },
  { value: "anulado", label: "Anulado" },
];

export function getLabel<T extends string>(
  catalog: CatalogItem<T>[],
  value: T,
): string {
  return catalog.find((item) => item.value === value)?.label ?? value;
}
