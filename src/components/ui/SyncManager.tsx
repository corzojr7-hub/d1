"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff, RefreshCcw } from "lucide-react";
import { get, set } from "idb-keyval";
import { submitWaste } from "@/app/waste/actions";
import { addFefoRecord, updateFefoStatus } from "@/app/waste/fefo/actions";
import { submitDailyAudit } from "@/app/audits/daily/actions";

type OfflineEvidenceFile = {
  dataUrl: string;
  name: string;
  type: string;
};

type OfflineWasteRecord = {
  barcode_id?: string;
  product_id?: string;
  product_name?: string;
  qty?: string;
  unit?: string;
  reason?: string;
  deposited_by?: string;
  area?: string;
  observation?: string;
  transport_driver?: string;
  transport_plate?: string;
  transport_comment?: string;
  quality_expiration_date?: string;
  quality_lot?: string;
  quality_supplier?: string;
  evidence_files?: Record<string, OfflineEvidenceFile>;
};

type OfflineFefoRecord =
  | {
      action: "ADD";
      barcode_id: string;
      product_name: string;
      quantity: number;
      expiration_date: string;
      operator_name?: string;
    }
  | {
      action: "UPDATE_STATUS";
      id: string;
      newStatus: string;
    };

type OfflineAuditRecord = {
  auditType: string;
  operator: string;
  answers: string;
  photo_base64?: string;
};

const WASTE_SYNC_TAG = "waste-offline-sync";

async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Service worker offline registration failed", error);
  }
}

async function requestOfflineSyncRegistration() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return;
    }
    const syncManager = registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };

    if (syncManager.sync) {
      await syncManager.sync.register(WASTE_SYNC_TAG);
    }
  } catch (error) {
    console.error("Offline background sync registration failed", error);
  }
}

async function dataUrlToFile(dataUrl: string, name: string, type: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type });
}

export default function SyncManager() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let syncing = false;

    async function syncOfflineData() {
      if (syncing || !navigator.onLine) {
        return;
      }

      syncing = true;
      setIsSyncing(true);

      try {
        const wasteQueue = (((await get("wasteOfflineQueue")) as OfflineWasteRecord[] | null) || []).filter(Boolean);
        const fefoQueue = (((await get("fefoOfflineQueue")) as OfflineFefoRecord[] | null) || []).filter(Boolean);
        const auditsQueue = (((await get("auditsOfflineQueue")) as OfflineAuditRecord[] | null) || []).filter(Boolean);

        const totalPending = wasteQueue.length + fefoQueue.length + auditsQueue.length;

        if (totalPending === 0) {
          return;
        }

        toast("Sincronizando registros offline...");
        let successCount = 0;
        let failedCount = 0;

        if (wasteQueue.length > 0) {
          const pendingWaste: OfflineWasteRecord[] = [];

          for (const record of wasteQueue) {
            try {
              const formData = new FormData();
              const textFields: Array<keyof OfflineWasteRecord> = [
                "barcode_id",
                "product_id",
                "product_name",
                "qty",
                "unit",
                "reason",
                "deposited_by",
                "area",
                "observation",
                "transport_driver",
                "transport_plate",
                "transport_comment",
                "quality_expiration_date",
                "quality_lot",
                "quality_supplier",
              ];

              for (const field of textFields) {
                const value = record[field];
                if (typeof value === "string" && value.length > 0) {
                  formData.append(field, value);
                }
              }

              for (const [field, fileMeta] of Object.entries(record.evidence_files || {})) {
                const file = await dataUrlToFile(
                  fileMeta.dataUrl,
                  fileMeta.name || `${field}.jpg`,
                  fileMeta.type || "image/jpeg",
                );
                formData.append(field, file);
              }

              const result = await submitWaste(formData);
              if (result?.error) {
                throw new Error(result.error);
              }

              successCount++;
            } catch (error) {
              console.error("Error merma offline:", error);
              pendingWaste.push(record);
              failedCount++;
            }
          }

          await set("wasteOfflineQueue", pendingWaste);
        }

        if (fefoQueue.length > 0) {
          const pendingFefo: OfflineFefoRecord[] = [];

          for (const record of fefoQueue) {
            try {
              if (record.action === "ADD") {
                await addFefoRecord({
                  barcode_id: record.barcode_id,
                  product_name: record.product_name,
                  quantity: record.quantity,
                  expiration_date: record.expiration_date,
                  operator_name: record.operator_name || "",
                });
              } else {
                await updateFefoStatus(record.id, record.newStatus);
              }

              successCount++;
            } catch (error) {
              console.error("Error FEFO offline:", error);
              pendingFefo.push(record);
              failedCount++;
            }
          }

          await set("fefoOfflineQueue", pendingFefo);
        }

        if (auditsQueue.length > 0) {
          const pendingAudits: OfflineAuditRecord[] = [];

          for (const record of auditsQueue) {
            try {
              const formData = new FormData();
              formData.append("auditType", record.auditType);
              formData.append("operator", record.operator);
              formData.append("answers", record.answers);

              if (record.photo_base64) {
                const file = await dataUrlToFile(record.photo_base64, "offline-audit-photo.jpg", "image/jpeg");
                formData.append("photo", file);
              }

              await submitDailyAudit(formData);
              successCount++;
            } catch (error) {
              console.error("Error audit offline:", error);
              pendingAudits.push(record);
              failedCount++;
            }
          }

          await set("auditsOfflineQueue", pendingAudits);
        }

        if (successCount > 0) {
          toast.success(`Se sincronizaron ${successCount} registros pendientes.`);
        }

        if (failedCount > 0) {
          await requestOfflineSyncRegistration();
          toast.error(`${failedCount} registros siguen pendientes. Se intentará de nuevo.`);
        }
      } catch (error) {
        console.error(error);
        await requestOfflineSyncRegistration();
        toast.error("Fallo al sincronizar. Se intentará luego.");
      } finally {
        syncing = false;
        setIsSyncing(false);
      }
    }

    function handleOnline() {
      setIsOffline(false);
      void syncOfflineData();
    }

    function handleOffline() {
      setIsOffline(true);
    }

    function handleServiceWorkerMessage(event: MessageEvent<{ type?: string }>) {
      if (event.data?.type === "SYNC_OFFLINE_DATA") {
        void syncOfflineData();
      }
    }

    setIsOffline(!navigator.onLine);
    void ensureServiceWorker().then(() => {
      if (navigator.onLine) {
        void syncOfflineData();
      }
    });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  if (!isOffline && !isSyncing) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-50">
      <div
        className={`flex items-center justify-center gap-2 px-4 py-1 text-[11px] font-bold text-white shadow-sm transition-colors ${
          isOffline ? "bg-amber-500" : "bg-blue-500"
        }`}
      >
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
