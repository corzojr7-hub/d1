"use client";

import { useZxing } from "react-zxing";
import { useState } from "react";

interface BarcodeScannerClientProps {
  onDetect: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerClient({ onDetect, onClose }: BarcodeScannerClientProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { ref } = useZxing({
    onDecodeResult(result) {
      onDetect(result.getText());
    },
    onError(error) {
      if (error.message.includes("Permission denied") || error.name === "NotAllowedError") {
        setCameraError("Permiso de cámara denegado. Por favor, habilítalo en tu navegador.");
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4">
      <div className="relative mx-auto max-w-md flex-1">
        {cameraError ? (
          <div className="mt-20 rounded-lg bg-white p-6 text-center text-sm text-zinc-600">
            <p>{cameraError}</p>
          </div>
        ) : (
          <>
            <video
              ref={ref}
              className="mt-12 w-full rounded-lg bg-black"
              playsInline
              muted
            />
            <p className="mt-2 text-center text-xs text-zinc-400">
              Enfoca un código de barras...
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mx-auto mt-4 rounded bg-white px-6 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
      >
        Cerrar escáner
      </button>
    </div>
  );
}
