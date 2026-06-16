"use client";

import { useEffect, useRef, useState } from "react";
import { isBarcodeDetectorSupported, startCamera, stopCamera } from "./barcode-scanner";

interface BarcodeScannerClientProps {
  onDetect: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerClient({ onDetect, onClose }: BarcodeScannerClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectRef = useRef(onDetect);
  const [supported] = useState(isBarcodeDetectorSupported);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    if (!supported) return;

    const video = videoRef.current;
    if (!video) return;

    startCamera()
      .then((stream) => {
        streamRef.current = stream;
        video.srcObject = stream;
        video.play();
        setDetecting(true);
      })
      .catch((err: unknown) => {
        setCameraError(
          "No se pudo acceder a la camara: " + (err instanceof Error ? err.message : String(err)),
        );
      });

    return () => {
      stopCamera(streamRef.current);
    };
  }, [supported]);

  useEffect(() => {
    if (!detecting || !supported) return;

    const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
    });
    let active = true;

    async function poll() {
      if (!active) return;
      if (!videoRef.current || videoRef.current.readyState < 2) {
        setTimeout(poll, 300);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && active) {
          onDetectRef.current(barcodes[0].rawValue);
          active = false;
        }
      } catch {
        // ignore detection errors
      }
      if (active) {
        setTimeout(poll, 300);
      }
    }

    poll();

    return () => {
      active = false;
    };
  }, [detecting, supported]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4">
      <div className="relative mx-auto max-w-md flex-1">
        {!supported ? (
          <div className="mt-20 rounded-lg bg-white p-6 text-center text-sm text-zinc-600">
            <p>Escaneo por camara no disponible en este navegador.</p>
            <p className="mt-2">Usa el campo manual de codigo de barras.</p>
          </div>
        ) : cameraError ? (
          <div className="mt-20 rounded-lg bg-white p-6 text-center text-sm text-zinc-600">
            <p>{cameraError}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="mt-12 w-full rounded-lg bg-black"
              playsInline
              muted
            />
            <p className="mt-2 text-center text-xs text-zinc-400">
              Enfoca un codigo de barras...
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          stopCamera(streamRef.current);
          onClose();
        }}
        className="mx-auto mt-4 rounded bg-white px-6 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
      >
        Cerrar escaner
      </button>
    </div>
  );
}
