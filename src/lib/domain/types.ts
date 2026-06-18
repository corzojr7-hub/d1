export type ProfileRole = "supervisor" | "segundo_al_mando" | "tercero_al_mando" | "admin";

export type ProfileStatus = "activo" | "inactivo";

export type AssistantContractType = "full_time" | "part_time" | "supervisor";

export interface StoreAssistant {
  name: string;
  contract_type: AssistantContractType;
}

export type TaskType = "apertura" | "cierre";

export interface BasicTaskConfig {
  id: string;
  name: string;
  type: TaskType;
  deadline_time: string; // "HH:MM" format
}

export type DailyBasicStatus = "en_espera" | "realizado" | "no_realizado";
export type DailyBasicFault = "asistente" | "supervisor" | null;

export interface DailyBasic {
  id: string;
  profile_id: string;
  date: string; // YYYY-MM-DD
  task_name: string;
  task_type: TaskType;
  assigned_to: string;
  status: DailyBasicStatus;
  fault: DailyBasicFault;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ProductStatus = "activo" | "inactivo";

export type InstructionPriority = "baja" | "media" | "alta" | "critica";

export type InstructionStatus =
  | "pendiente"
  | "en_proceso"
  | "cumplida"
  | "no_cumplida"
  | "requiere_seguimiento"
  | "anulada";

export type WasteReason =
  | "vencido"
  | "averia_transporte"
  | "dano_manipulacion"
  | "dano_cliente"
  | "dano_temperatura"
  | "perdida_vacio"
  | "empaque_roto"
  | "producto_contaminado"
  | "recuperable_mal_descartado"
  | "reporte_calidad"
  | "otro";

export type WasteReviewStatus =
  | "pendiente_revision"
  | "revisado"
  | "recuperable"
  | "no_recuperable"
  | "requiere_seguimiento"
  | "anulado";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  store_name: string;
  store_code: string;
  second_in_charge: string;
  third_in_charge: string;
  assistant_count: number;
  assistants: StoreAssistant[];
  areas: string[];
  basic_tasks: BasicTaskConfig[];
  supervisor_name?: string;
  requires_password_change?: boolean;

  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  suggested_unit: string | null;
  status: ProductStatus;
  source_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Instruction {
  id: string;
  responsible_person: string;
  instruction_text: string;
  priority: InstructionPriority;
  status: InstructionStatus;
  observations: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WasteRecord {
  id: string;
  barcode: string;
  product_id: string | null;
  product_name: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  reason: WasteReason;
  responsible_person: string;
  created_by: string;
  area: string;
  observation: string;
  review_status: WasteReviewStatus;
  product_not_found: boolean;
  evidence_path: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesBudget {
  id: string;
  store_code: string;
  month_year: string;
  budget_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DailySale {
  id: string;
  store_code: string;
  date: string;
  amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyWaste {
  id: string;
  store_code: string;
  week_start: string;
  week_end: string;
  waste_amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
