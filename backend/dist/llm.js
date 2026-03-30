"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeClinical = synthesizeClinical;
exports.heuristicSummary = heuristicSummary;
const zod_1 = require("zod");
const ChatResponse = zod_1.z.object({
    choices: zod_1.z.array(zod_1.z.object({ message: zod_1.z.object({ content: zod_1.z.string().optional() }).optional() })),
});
function normalizeBase(url) {
    const u = url.replace(/\/$/, "");
    return u.endsWith("/v1") ? u : `${u}/v1`;
}
async function synthesizeClinical(input) {
    const base = normalizeBase(input.baseUrl);
    const body = {
        model: input.model,
        messages: [
            {
                role: "system",
                content: "You are a clinical documentation assistant running offline. Produce a concise, neutral clinical summary for the provider. Use bullet points where helpful. Flag uncertainty explicitly. Do not invent facts not supported by the excerpt.",
            },
            {
                role: "user",
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
    const json = await res.json();
    const parsed = ChatResponse.safeParse(json);
    if (!parsed.success) {
        throw new Error("Unexpected LLM response shape");
    }
    const text = parsed.data.choices[0]?.message?.content?.trim() ?? "";
    if (!text)
        throw new Error("Empty LLM completion");
    return { text, modelUsed: input.model };
}
function heuristicSummary(sourceLabel, raw) {
    return [
        "Local synthesis (LLM unavailable or disabled)",
        `Source: ${sourceLabel}`,
        "",
        "Extracted context preview:",
        raw.slice(0, 4000),
    ].join("\n");
}
