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
  { value: "fecha_corta_cedi", label: "Fecha corta CEDI" },
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
  { value: "reporte_calidad", label: "Calidad" },
  { value: "calidad_nacional", label: "Calidad nacional" },
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

export type FefoCategoryInfo = {
  value: string;
  label: string;
  retirementDays: number;
};

export const FEFO_CATEGORIES: FefoCategoryInfo[] = [
  { value: "leche_fresca", label: "Leche Fresca", retirementDays: 1 },
  { value: "postres", label: "Postres (<20 días)", retirementDays: 2 },
  { value: "bebidas_frescas", label: "Bebidas Líquidas (Frescas)", retirementDays: 1 },
  { value: "pollo", label: "Carne No Procesada (Pollo)", retirementDays: 1 },
  { value: "lacteos_frescos", label: "Lácteos (Fresco, Cuajada)", retirementDays: 2 },
  { value: "carnes", label: "Carne No Procesada (Carnes)", retirementDays: 2 },
  { value: "panaderia", label: "Panadería", retirementDays: 3 },
  { value: "arepas", label: "Arepas", retirementDays: 3 },
  { value: "huevos", label: "Huevos", retirementDays: 3 },
  { value: "carnes_frias", label: "Carnes Frías", retirementDays: 5 },
  { value: "quesos_hilados", label: "Lácteos (Quesos hilados)", retirementDays: 5 },
  { value: "bebidas_lacteas", label: "Lácteos (Bebidas lácteas)", retirementDays: 5 },
  { value: "otro", label: "Otro / General", retirementDays: 0 },
];
