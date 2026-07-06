"use client";

import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Camera,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type DispatchCardEvidence = {
  created_at: string;
};

type DispatchCardRecord = {
  id: string;
  status: string;
  created_at: string;
  dispatch_date: string;
  truck_plate: string;
  driver_name: string;
  category: string;
  description: string;
  dispatch_evidences?: DispatchCardEvidence[] | null;
};

export default function DispatchCard({
  dispatch,
}: {
  dispatch: DispatchCardRecord;
}) {
  const daysPending = differenceInDays(new Date(), new Date(dispatch.created_at));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const hasEvidenceToday = dispatch.dispatch_evidences?.some((ev) => {
    return new Date(ev.created_at) >= todayStart;
  });

  const isPending = dispatch.status === "pendiente";

  return (
    <Link
      href={`/dispatches/${dispatch.id}`}
      className={`group relative flex flex-col rounded-[24px] border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:p-5 ${
        isPending
          ? hasEvidenceToday
            ? "border-emerald-100 bg-white"
            : "border-red-100 bg-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
            {dispatch.category}
          </span>
          <h3 className="text-sm font-black leading-tight text-slate-900">
            Placa: {dispatch.truck_plate}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {dispatch.driver_name}
          </p>
        </div>

        {isPending ? (
          <div
            className={`flex shrink-0 flex-col items-center rounded-2xl px-2.5 py-2 shadow-sm ${
              hasEvidenceToday
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              Día {daysPending + 1}
            </span>
            {hasEvidenceToday ? (
              <CheckCircle2 className="mt-1 h-4 w-4" />
            ) : (
              <AlertTriangle className="mt-1 h-4 w-4" />
            )}
          </div>
        ) : (
          <div
            className={`flex shrink-0 flex-col items-center rounded-2xl px-2.5 py-2 shadow-sm ${
              dispatch.status === "aplicado"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              {dispatch.status}
            </span>
          </div>
        )}
      </div>

      <p className="mb-4 flex-grow text-sm leading-6 text-slate-600 line-clamp-3">
        {dispatch.description}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium">
        <div className="flex items-center text-slate-500">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {format(new Date(dispatch.dispatch_date), "d MMM yyyy", { locale: es })}
        </div>

        {isPending && (
          <div
            className={`flex items-center font-bold ${
              hasEvidenceToday ? "text-emerald-600" : "text-red-600"
            }`}
          >
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {hasEvidenceToday ? "Evidencia OK" : "Falta evidencia"}
          </div>
        )}
      </div>
    </Link>
  );
}
