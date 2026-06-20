import { createAdminClient } from "@/lib/supabase/admin";

const GEMINI_35_FLASH_INPUT_USD_PER_1M = 1.5;
const GEMINI_35_FLASH_OUTPUT_USD_PER_1M = 9;

type GeminiUsageMetadata = {
  promptTokenCount?: number | null;
  candidatesTokenCount?: number | null;
  totalTokenCount?: number | null;
};

export const AI_ACTIONS = {
  schedule: "AI_SCHEDULE_GENERATE",
  feedback: "AI_FEEDBACK_REWRITE",
} as const;

export function estimateGemini35FlashCostUsd(usage?: GeminiUsageMetadata | null) {
  const promptTokens = Number(usage?.promptTokenCount ?? 0);
  const outputTokens = Number(usage?.candidatesTokenCount ?? 0);

  const inputCost = (promptTokens / 1_000_000) * GEMINI_35_FLASH_INPUT_USD_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * GEMINI_35_FLASH_OUTPUT_USD_PER_1M;

  return Number((inputCost + outputCost).toFixed(6));
}

export async function logAiUsage({
  adminId,
  storeCode,
  actionType,
  model,
  usage,
}: {
  adminId: string;
  storeCode: string;
  actionType: (typeof AI_ACTIONS)[keyof typeof AI_ACTIONS];
  model: string;
  usage?: GeminiUsageMetadata | null;
}) {
  try {
    const adminClient = createAdminClient();
    const estimatedCostUsd = estimateGemini35FlashCostUsd(usage);

    await adminClient.from("admin_audit_logs").insert({
      admin_id: adminId,
      target_id: adminId,
      store_code: storeCode,
      action_type: actionType,
      details: {
        model,
        prompt_tokens: Number(usage?.promptTokenCount ?? 0),
        output_tokens: Number(usage?.candidatesTokenCount ?? 0),
        total_tokens: Number(usage?.totalTokenCount ?? 0),
        estimated_cost_usd: estimatedCostUsd,
      },
    });
  } catch (error) {
    console.error("AI usage log error:", error);
  }
}
