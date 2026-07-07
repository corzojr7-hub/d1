import OpenAI from "openai";

export type AiClientConfig = {
  client: OpenAI;
  model: string;
};

export function getAiClientConfig(): AiClientConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      client: new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      }),
      model: process.env.DEEPSEEK_DEFAULT_MODEL || "deepseek-v3",
    };
  }

  return null;
}
