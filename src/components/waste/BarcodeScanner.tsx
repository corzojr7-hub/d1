"use client";

import { Camera, X } from "lucide-react";
import { useState } from "react";
import { useZxing } from "react-zxing";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { ref } = useZxing({
    paused,
    onDecodeResult(result) {
      const value = result.rawValue.trim();
      if (!value) return;
      setPaused(true);
      onScan(value);
    },
    onError(scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "No se pudo iniciar la camara.",
      );
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 px-4 py-5 text-white">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera aria-hidden="true" className="h-5 w-5 text-red-300" />
            <h2 className="text-base font-semibold">Escanear codigo</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Cerrar camara"
            title="Cerrar camara"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/15 bg-black">
          <video
            ref={ref}
            className="aspect-[3/4] w-full object-cover sm:aspect-video"
            muted
            playsInline
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-400/15 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-zinc-300">
            Enfoca el codigo de barras dentro del recuadro.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
        >
          Cerrar camara
        </button>
      </div>
    </div>
  );
}
