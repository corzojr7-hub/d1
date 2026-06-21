export const TRUCK_REPORT_PREFIX = "__truck_report__::";

export type TruckReportPayload = {
  reportText: string;
  reportedAt: string;
  storeName: string;
  arrivalAreas: string[];
  pallets: string;
  driver: string;
  plate: string;
  temperature?: string;
  novelty: string;
  sentAt?: string | null;
  sentBy?: string | null;
};

export function serializeTruckReport(payload: TruckReportPayload) {
  return `${TRUCK_REPORT_PREFIX}${JSON.stringify(payload)}`;
}

export function parseTruckReportContent(content: string): TruckReportPayload | null {
  if (!content.startsWith(TRUCK_REPORT_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(content.slice(TRUCK_REPORT_PREFIX.length)) as TruckReportPayload;
  } catch {
    return null;
  }
}

