"use client";

import { useRef, useState } from "react";
import SecurityPinModal from "@/components/team/SecurityPinModal";
import { startWasteWeekCut } from "@/app/waste/actions";

type Props = {
  hasPin: boolean;
};

export default function StartWasteWeekCutButton({ hasPin: initialHasPin }: Props) {
  const [hasPin, setHasPin] = useState(initialHasPin);
  const [showPinModal, setShowPinModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handlePinSuccess() {
    setShowPinModal(false);
    if (!hasPin) {
      setHasPin(true);
    }
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPinModal(true)}
        className="app-cta-primary px-4 py-2 text-xs font-bold"
      >
        Iniciar nueva semana
      </button>

      <form ref={formRef} action={startWasteWeekCut} className="hidden" />

      <SecurityPinModal
        isOpen={showPinModal}
        onClose={() => {
          if (!hasPin) {
            alert("Debes crear tu PIN de supervisor para poder iniciar el corte semanal.");
            return;
          }
          setShowPinModal(false);
        }}
        onSuccess={handlePinSuccess}
        isFirstTime={!hasPin}
      />
    </>
  );
}
