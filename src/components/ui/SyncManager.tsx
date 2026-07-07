"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff, RefreshCcw } from "lucide-react";
import { get, set } from "idb-keyval";
import { submitWaste } from "@/app/waste/actions";
import { addFefoRecord, updateFefoStatus } from "@/app/waste/fefo/actions";
import { submitDailyAudit } from "@/app/audits/daily/actions";

export default function SyncManager() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function syncOfflineData() {
      setIsSyncing(true);
      try {
        const wasteQueue = await get("wasteOfflineQueue");
        const fefoQueue = await get("fefoOfflineQueue");
        const auditsQueue = await get("auditsOfflineQueue");

        const totalPending = (wasteQueue?.length || 0) + (fefoQueue?.length || 0) + (auditsQueue?.length || 0);
        
        if (totalPending === 0) {
          setIsSyncing(false);
          return;
        }
        
        toast("Sincronizando registros offline...");
        let successCount = 0;

        if (wasteQueue && wasteQueue.length > 0) {
          for (const record of wasteQueue) {
            try {
              const formData = new FormData();
              formData.append("barcode_id", record.barcode_id || "");
              if (record.product_id) formData.append("product_id", record.product_id);
              formData.append("qty", record.qty?.toString() || "");
              formData.append("unit", record.unit || "");
              formData.append("reason", record.reason || "");
              formData.append("deposited_by", record.deposited_by || "");
              formData.append("area", record.area || "");
              formData.append("observation", record.observation || "");
              if (record.transport_driver) formData.append("transport_driver", record.transport_driver);
              if (record.transport_plate) formData.append("transport_plate", record.transport_plate);
              if (record.transport_comment) formData.append("transport_comment", record.transport_comment);
              if (record.transport_evidence) formData.append("transport_evidence", record.transport_evidence);

              if (record.evidence_base64) {
                const res = await fetch(record.evidence_base64);
                const blob = await res.blob();
                const file = new File([blob], 'offline-evidence.jpg', { type: 'image/jpeg' });
                formData.append("evidence", file);
              }
              await submitWaste(formData);
              successCount++;
            } catch (e) {
              console.error("Error merma:", e);
            }
          }
          await set("wasteOfflineQueue", []);
        }

        if (fefoQueue && fefoQueue.length > 0) {
          for (const record of fefoQueue) {
            try {
              if (record.action === "ADD") {
                await addFefoRecord({
                  barcode_id: record.barcode_id,
                  product_name: record.product_name,
                  quantity: record.quantity,
                  expiration_date: record.expiration_date,
                  operator_name: record.operator_name || ""
                });
              } else if (record.action === "UPDATE_STATUS") {
                await updateFefoStatus(record.id, record.newStatus);
              }
              successCount++;
            } catch (e) {
              console.error("Error FEFO:", e);
            }
          }
          await set("fefoOfflineQueue", []);
        }

        if (auditsQueue && auditsQueue.length > 0) {
          for (const record of auditsQueue) {
            try {
              const formData = new FormData();
              formData.append("auditType", record.auditType);
              formData.append("operator", record.operator);
              formData.append("answers", record.answers);
              if (record.photo_base64) {
                const res = await fetch(record.photo_base64);
                const blob = await res.blob();
                const file = new File([blob], 'offline-audit-photo.jpg', { type: 'image/jpeg' });
                formData.append("photo", file);
              }
              await submitDailyAudit(formData);
              successCount++;
            } catch (e) {
              console.error("Error audit:", e);
            }
          }
          await set("auditsOfflineQueue", []);
        }

        toast.success(`Se sincronizaron ${successCount} de ${totalPending} registros pendientes.`);
      } catch (err) {
        console.error(err);
        toast.error("Fallo al sincronizar. Se intentará luego.");
      } finally {
        setIsSyncing(false);
      }
    }

    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineData();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);


  if (!isOffline && !isSyncing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className={`flex items-center justify-center gap-2 py-1 px-4 text-[11px] font-bold text-white shadow-sm transition-colors ${
        isOffline ? "bg-amber-500" : "bg-blue-500"
      }`}>
        {isOffline ? (
          <>
            <WifiOff className="h-3 w-3" />
            Sin conexión. Guardando localmente.
          </>
        ) : (
          <>
            <RefreshCcw className="h-3 w-3 animate-spin" />
            Sincronizando datos...
          </>
        )}
      </div>
    </div>
  );
}
