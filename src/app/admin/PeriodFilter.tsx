import Link from "next/link";
import { ADMIN_PERIODS, type AdminPeriodKey } from "./admin-metrics";

export default function PeriodFilter({
  active,
  pathname,
}: {
  active: AdminPeriodKey;
  pathname: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ADMIN_PERIODS.map((period) => (
        <Link
          key={period.key}
          href={`${pathname}?period=${period.key}`}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            active === period.key
              ? "bg-[#e51d2e] text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {period.label}
        </Link>
      ))}
    </div>
  );
}
