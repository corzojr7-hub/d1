"use client";

import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, Calendar, Camera, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function DispatchCard({ dispatch }: { dispatch: any }) {
  const daysPending = differenceInDays(new Date(), new Date(dispatch.created_at));
  
  // Revisar si ya se subió evidencia HOY
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const hasEvidenceToday = dispatch.dispatch_evidences?.some((ev: any) => {
    return new Date(ev.created_at) >= todayStart;
  });

  const isPending = dispatch.status === "pendiente";

  return (
    <Link 
      href={`/dispatches/${dispatch.id}`}
      className={`relative flex flex-col rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
        isPending 
          ? hasEvidenceToday 
            ? "border-emerald-200 bg-emerald-50/30" 
            : "border-red-200 bg-red-50/30"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            {dispatch.category}
          </span>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            Placa: {dispatch.truck_plate}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {dispatch.driver_name}
          </p>
        </div>

        {isPending ? (
          <div className={`flex flex-col items-center rounded-lg px-2 py-1.5 ${
            hasEvidenceToday ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wide">
              Día {daysPending + 1}
            </span>
            {hasEvidenceToday ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 mt-0.5" />
            )}
          </div>
        ) : (
          <div className={`flex flex-col items-center rounded-lg px-2 py-1.5 ${
            dispatch.status === "aplicado" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {dispatch.status}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600 line-clamp-2 flex-grow mb-3">
        {dispatch.description}
      </p>

      <div className="flex items-center justify-between text-xs font-medium border-t border-slate-100 pt-3 mt-auto">
        <div className="flex items-center text-slate-500">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {format(new Date(dispatch.dispatch_date), "d MMM yyyy", { locale: es })}
        </div>
        
        {isPending && (
          <div className={`flex items-center ${hasEvidenceToday ? "text-emerald-600" : "text-red-600"}`}>
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {hasEvidenceToday ? "Evidencia OK" : "Falta Evidencia"}
          </div>
        )}
      </div>
    </Link>
  );
}
