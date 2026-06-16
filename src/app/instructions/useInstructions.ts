"use client";

import { useState, useEffect, useCallback } from "react";
import type { Instruction } from "@/lib/domain/types";
import {
  fetchInstructions,
  updateInstructionStatus,
  removeInstruction,
  clearInstructions,
} from "./actions";

export function useInstructions() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInstructions()
      .then((data) => {
        if (!cancelled) {
          setInstructions(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Error al cargar instrucciones",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInstructions();
      setInstructions(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar instrucciones",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      await updateInstructionStatus(id, status);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeInstruction(id);
      await refresh();
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    await clearInstructions();
    await refresh();
  }, [refresh]);

  return {
    instructions,
    loading,
    error,
    refresh,
    updateStatus,
    remove,
    clearAll,
  };
}
