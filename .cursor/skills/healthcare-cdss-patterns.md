---
name: healthcare-cdss-patterns
description: Clinical Decision Support System (CDSS) patterns. Drug interaction checking, dose validation, clinical scoring, alert severity classification, and integration into clinical workflows.
---

# Healthcare CDSS Development Patterns

Patterns for Clinical Decision Support. CDSS modules are **patient safety critical — zero tolerance for false negatives**.

## Core Principle

The CDSS engine must be a **pure function library with zero side effects**. Input clinical data, output alerts. This makes it fully testable.

## Alert Severity and UI Behavior

| Severity | UI Behavior                               | Clinician Action Required                |
| -------- | ----------------------------------------- | ---------------------------------------- |
| Critical | Block action. Non-dismissable modal. Red. | Must document override reason to proceed |
| Major    | Warning banner inline. Orange.            | Must acknowledge before proceeding       |
| Minor    | Info note inline. Yellow.                 | Awareness only                           |

Critical alerts must NEVER be auto-dismissed or implemented as toast notifications. Override reasons must be stored in the audit trail.

## Drug Interaction Checking

```typescript
interface DrugInteractionPair {
  drugA: string;
  drugB: string;
  severity: "critical" | "major" | "minor";
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}
```

- Interaction pairs must be **bidirectional**: if Drug A interacts with Drug B, then Drug B interacts with Drug A
- Allergy cross-reactivity must also be checked and treated as `critical`

## Dose Validation Safety Rule

If a drug requires weight-based dosing and patient weight is missing:

- **BLOCK** the prescription — do not silently pass
- Return `{ valid: false, factors: ['weight_missing'] }`

Never pass validation when required parameters are absent.

## Clinical Scoring: NEWS2

NEWS2 scoring tables must match the Royal College of Physicians specification exactly. Output must include:

- Total score (0–20)
- Risk level: `'low' | 'low-medium' | 'medium' | 'high'`
- Escalation guidance text

## Testing CDSS — Zero Tolerance

```typescript
describe("CDSS — Patient Safety", () => {
  INTERACTION_PAIRS.forEach(({ drugA, drugB, severity }) => {
    it(`detects ${drugA} + ${drugB} (${severity})`, () => {
      const alerts = checkInteractions(drugA, [drugB], []);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe(severity);
    });
    it(`detects ${drugB} + ${drugA} (reverse)`, () => {
      const alerts = checkInteractions(drugB, [drugA], []);
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
  it("blocks mg/kg drug when weight is missing", () => {
    const result = validateDose("gentamicin", 300, "iv");
    expect(result.valid).toBe(false);
    expect(result.factors).toContain("weight_missing");
  });
});
```

Pass criteria: **100%.** A single missed interaction is a patient safety event.

## Anti-Patterns

- Making CDSS checks optional or skippable without a documented reason
- Implementing interaction alerts as toast notifications
- Using `any` types for drug or clinical data
- Silently catching errors in the CDSS engine — must surface failures loudly
- Skipping weight-based validation when weight is absent — must block, not pass

## Sift Applicability

Sift currently reads and summarizes records. If it ever surfaces drug data, diagnosis codes, or lab values in a structured way, these CDSS patterns apply to any alerting or flagging logic built on top of that extracted data.
