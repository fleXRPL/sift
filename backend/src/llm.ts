import { z } from "zod";

const ChatResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().optional() }).optional() })),
});

function normalizeBase(url: string): string {
  const u = url.replace(/\/$/, "");
  return u.endsWith("/v1") ? u : `${u}/v1`;
}

export async function synthesizeClinical(input: {
  baseUrl: string;
  model: string;
  sourceLabel: string;
  rawContext: string;
}): Promise<{ text: string; modelUsed: string }> {
  const base = normalizeBase(input.baseUrl);
  const body = {
    model: input.model,
    messages: [
      {
        role: "system" as const,
        content:
          "You are a clinical documentation assistant running offline. Produce a concise, neutral clinical summary for the provider. Use bullet points where helpful. Flag uncertainty explicitly. Do not invent facts not supported by the excerpt.",
      },
      {
        role: "user" as const,
        content: `Source: ${input.sourceLabel}\n\nClinical excerpt / structured data:\n${input.rawContext.slice(0, 24000)}`,
      },
    ],
    temperature: 0.2,
  };

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${t.slice(0, 500)}`);
  }

  const json: unknown = await res.json();
  const parsed = ChatResponse.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected LLM response shape");
  }
  const text = parsed.data.choices[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Empty LLM completion");
  return { text, modelUsed: input.model };
}

export function heuristicSummary(sourceLabel: string, raw: string): string {
  return [
    "Local synthesis (LLM unavailable or disabled)",
    `Source: ${sourceLabel}`,
    "",
    "Extracted context preview:",
    raw.slice(0, 4000),
  ].join("\n");
}
