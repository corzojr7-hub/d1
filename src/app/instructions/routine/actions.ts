"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSupervisor, validateOperatorName } from "@/lib/supabase/require-auth";

const ROUTINES = {
  supervisor_apertura: [
    { content: "Verificar checklist de apertura general", priority: "Alta" },
    { content: "Revisar correo de gerencia y promociones", priority: "Media" },
    { content: "Auditar cuarto frío y rotación FEFO", priority: "Alta" },
    { content: "Realizar arqueo inicial de cajas", priority: "Alta" },
  ],
  supervisor_cierre: [
    { content: "Validar depósitos y cuadre de cajas", priority: "Alta" },
    { content: "Supervisar limpieza profunda de neveras", priority: "Media" },
    { content: "Cerrar tienda en sistema y alarmar", priority: "Alta" },
  ],
  asistente_apertura: [
    { content: "Limpieza exterior", priority: "Media" },
    { content: "Surtir fruver y revisar mermas del día anterior", priority: "Alta" },
    { content: "Revisar neveras y frentes de góndola", priority: "Media" },
  ],
  asistente_cierre: [
    { content: "Recoger basuras y cartón", priority: "Media" },
    { content: "Trapear piso general", priority: "Baja" },
    { content: "Recoger mermas y llenar formato", priority: "Alta" },
  ]
};

const PASILLO_DAILY_TASKS: Record<number, { content: string; priority: string }[]> = {
  1: [ // Lunes
    { content: "Limpieza profunda de polvo en entrepaños y productos del pasillo", priority: "Alta" },
    { content: "Revisión exhaustiva de fechas de vencimiento (FEFO) de su sección", priority: "Alta" }
  ],
  2: [ // Martes
    { content: "Revisión de precios, reposición de portaprecios faltantes y limpieza de los mismos", priority: "Media" },
    { content: "Aseo debajo de las góndolas", priority: "Media" }
  ],
  3: [ // Miércoles
    { content: "Limpieza con trapo húmedo de parales y estructuras metálicas", priority: "Media" },
    { content: "Verificación rigurosa de rotación interna (producto viejo adelante)", priority: "Alta" }
  ],
  4: [ // Jueves
    { content: "Quitar chicles, raspar manchas del piso en su pasillo", priority: "Media" },
    { content: "Limpieza y reacomodo de exhibiciones adicionales/puntas", priority: "Media" }
  ],
  5: [ // Viernes
    { content: "Facing perfecto: alineación milimétrica de productos con el precio", priority: "Alta" },
    { content: "Retiro de reguero", priority: "Media" }
  ],
  6: [ // Sábado
    { content: "Mantenimiento rápido visual: alinear etiquetas y recoger basura suelta", priority: "Baja" }
  ],
  0: [ // Domingo
    { content: "Retirar productos de otros pasillos abandonados en su zona", priority: "Baja" },
    { content: "Barrido rápido exclusivo de su pasillo", priority: "Baja" }
  ]
};

export async function generateRoutineTasks(role: string, shift: string, responsible: string) {
  const { profile, supabase } = await requireSupervisor();

  let tasksToGenerate;

  if (role === "pasillo") {
    const currentDay = new Date().getDay();
    tasksToGenerate = PASILLO_DAILY_TASKS[currentDay];
  } else {
    const routineKey = `${role}_${shift}` as keyof typeof ROUTINES;
    tasksToGenerate = ROUTINES[routineKey];
  }

  if (!tasksToGenerate) {
    return { error: "Rutina no encontrada" };
  }

  const inserts = tasksToGenerate.map(t => ({
    store_code: profile.store_code,
    responsible: responsible,
    content: t.content,
    priority: t.priority,
    status: "pendiente",
    created_by: profile.id
  }));

  const { error } = await supabase.from("instructions").insert(inserts);

  if (error) {
    console.error("Error generating routine:", error);
    return { error: "Error al generar la rutina" };
  }

  revalidatePath("/instructions/routine");
  return { success: true };
}

export async function updateTaskStatus(taskId: string, newStatus: string, operatorName: string = "") {
  const { profile, supabase } = await requireAuth();

  if (operatorName) {
    validateOperatorName(profile, operatorName);
  }

  if (newStatus === "anulada" && profile.role !== "supervisor") {
    return { error: "Solo un supervisor puede anular tareas." };
  }

  const { error } = await supabase.from("instructions")
    .update({ status: newStatus, operator_name: operatorName })
    .eq("id", taskId)
    .eq("store_code", profile.store_code);

  if (error) {
    return { error: "Error al actualizar la tarea" };
  }

  revalidatePath("/instructions/routine");
  return { success: true };
}
