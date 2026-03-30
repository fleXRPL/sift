"use strict";
/**
 * Minimal HL7 v2 pipe-delimited line parser for ORU/ADT-style exports — enough for local summarization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFromHl7 = extractFromHl7;
exports.looksLikeHl7 = looksLikeHl7;
function segmentName(line) {
    return line.startsWith("MSH") ? "MSH" : line.slice(0, 3);
}
function extractFromHl7(text) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    const segments = lines.map(segmentName);
    let messageType = null;
    let patientId = null;
    for (const line of lines) {
        if (line.startsWith("MSH|")) {
            const f = line.split("|");
            if (f.length > 8)
                messageType = `${f[8] ?? ""}^${f[9] ?? ""}`.replace(/\^+$/, "");
        }
        if (line.startsWith("PID|")) {
            const f = line.split("|");
            if (f.length > 3)
                patientId = f[3] ?? null;
        }
    }
    const preview = lines.slice(0, 40).join("\n");
    const narrative = [
        `HL7 message with segments: ${[...new Set(segments)].join(", ")}`,
        messageType ? `Message type: ${messageType}` : null,
        patientId ? `Patient ID field (PID-3): ${patientId}` : null,
        "",
        "Raw preview:",
        preview,
    ]
        .filter(Boolean)
        .join("\n");
    return {
        messageType,
        patientId,
        segments,
        narrative,
    };
}
function looksLikeHl7(text) {
    const t = text.trimStart();
    return t.startsWith("MSH|") || (t.includes("|") && t.includes("PID|"));
}
