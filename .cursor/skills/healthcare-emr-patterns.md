---
name: healthcare-emr-patterns
description: EMR/EHR development patterns for clinical safety, encounter workflows, and accessible UI for medical data.
---

# Healthcare EMR Development Patterns

Patterns for building Electronic Medical Record (EMR) systems. Prioritizes patient safety, clinical accuracy, and practitioner efficiency.

## Patient Safety First

Every design decision must be evaluated against: **"Could this harm a patient?"**

- Abnormal lab values MUST be visually flagged
- Critical values MUST trigger a non-dismissable alert — never a toast
- No clinical data modification without audit trail

## UI Patterns for Clinical Data

**Contrast:** 4.5:1 minimum (WCAG AA) — clinicians work in varied lighting

**Touch targets:** 44×44px minimum — for gloved or rushed interaction

**Color-only indicators:** Never use color alone — always pair with text or icon (colorblind clinicians)

**Clinical alerts:** Never use auto-dismissing toasts for clinical alerts — clinician must actively acknowledge

**Screen readers:** Labels on all form fields

## Alert Severity and UI Behavior

| Severity | UI Behavior                               | Action Required                          |
| -------- | ----------------------------------------- | ---------------------------------------- |
| Critical | Block action. Non-dismissable modal. Red. | Must document override reason to proceed |
| Major    | Warning banner inline. Orange.            | Must acknowledge before proceeding       |
| Minor    | Info note inline. Yellow.                 | Awareness only                           |

Critical alerts must **never** be auto-dismissed or implemented as toasts.

## Locked Record Pattern

Once a clinical record is signed / finalized:

- No edits allowed — only an addendum (a separate linked record)
- Both original and addendum appear in the patient timeline
- Audit trail captures who finalized, when, and any addendum records

## Anti-Patterns

- Storing clinical data in browser localStorage
- Silent failures in data validation
- Dismissable toasts for critical clinical alerts
- Allowing edits to signed/locked records
- Displaying clinical data without audit trail
- Using `any` type for clinical data structures

## Sift Applicability

Sift ingests FHIR, HL7, and PDF records — apply these patterns when:

- Displaying extracted clinical data (lab results, diagnoses, medications)
- Generating or displaying LLM summaries of patient records
- Implementing any future write-back or annotation feature
