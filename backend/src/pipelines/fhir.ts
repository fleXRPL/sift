/**
 * Lightweight FHIR Bundle / Resource inspection — no full validator; safe extraction for local LLM narration.
 */

export type FhirExtract = {
  resourceType: string;
  patientLabel: string | null;
  narrative: string;
  structuredHighlights: Record<string, unknown>;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function textFromHumanName(names: unknown): string | null {
  if (!Array.isArray(names) || names.length === 0) return null;
  const n = asRecord(names[0]);
  if (!n) return null;
  const given = Array.isArray(n.given) ? (n.given as string[]).join(" ") : "";
  const family = typeof n.family === "string" ? n.family : "";
  const s = `${given} ${family}`.trim();
  return s.length ? s : null;
}

export function extractFromFhirJson(text: string): FhirExtract {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return {
      resourceType: "Invalid",
      patientLabel: null,
      narrative: "Could not parse JSON as FHIR.",
      structuredHighlights: {},
    };
  }
  const r = asRecord(root);
  if (!r) {
    return {
      resourceType: "Unknown",
      patientLabel: null,
      narrative: "Empty JSON document.",
      structuredHighlights: {},
    };
  }
  const rt = typeof r.resourceType === "string" ? r.resourceType : "Unknown";

  if (rt === "Bundle" && Array.isArray(r.entry)) {
    let patientLabel: string | null = null;
    const lines: string[] = [];
    const highlights: Record<string, unknown> = { entryCount: r.entry.length };

    for (const entry of r.entry) {
      const er = asRecord(entry);
      const res = er ? asRecord(er.resource) : null;
      if (!res) continue;
      const ert = typeof res.resourceType === "string" ? res.resourceType : "?";
      if (ert === "Patient") {
        patientLabel = textFromHumanName(res.name) ?? patientLabel;
        lines.push(`Patient: ${patientLabel ?? "unlabeled"}`);
      }
      if (ert === "Observation") {
        const code = asRecord(res.code);
        const coding = code && Array.isArray(code.coding) ? asRecord(code.coding[0]) : null;
        const label = coding?.display ?? coding?.code ?? "Observation";
        const valQty = asRecord(res.valueQuantity);
        const valStr = typeof res.valueString === "string" ? res.valueString : null;
        const val = valQty
          ? `${valQty.value ?? ""} ${valQty.unit ?? ""}`.trim()
          : valStr ?? JSON.stringify(res.valueQuantity ?? res.valueString ?? "");
        lines.push(`Observation ${String(label)}: ${val}`);
      }
      if (ert === "MedicationRequest" || ert === "MedicationStatement") {
        const med = asRecord(res.medicationCodeableConcept);
        const coding = med && Array.isArray(med.coding) ? asRecord(med.coding[0]) : null;
        lines.push(`Medication: ${String(coding?.display ?? coding?.code ?? ert)}`);
      }
      if (ert === "Condition") {
        const code = asRecord(res.code);
        const coding = code && Array.isArray(code.coding) ? asRecord(code.coding[0]) : null;
        lines.push(`Condition: ${String(coding?.display ?? coding?.code ?? "recorded")}`);
      }
    }

    const narrative = lines.length ? lines.join("\n") : "FHIR Bundle with no recognized clinical rows.";
    return {
      resourceType: "Bundle",
      patientLabel,
      narrative,
      structuredHighlights: highlights,
    };
  }

  if (rt === "Patient") {
    const label = textFromHumanName(r.name);
    return {
      resourceType: "Patient",
      patientLabel: label,
      narrative: `Single Patient resource${label ? `: ${label}` : ""}.`,
      structuredHighlights: { id: r.id },
    };
  }

  return {
    resourceType: rt,
    patientLabel: null,
    narrative: `FHIR resource type ${rt} (full narrative left to LLM).`,
    structuredHighlights: { id: r.id },
  };
}
