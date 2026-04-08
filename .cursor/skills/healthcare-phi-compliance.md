---
name: healthcare-phi-compliance
description: PHI/PII compliance patterns for healthcare applications. Covers data classification, access control, audit trails, encryption, and common leak vectors.
---

# Healthcare PHI/PII Compliance Patterns

Patterns for protecting patient data in healthcare applications. Applicable to HIPAA (US) and general healthcare data protection.

## Data Classification

**PHI (Protected Health Information)** — any data that can identify a patient AND relates to their health:

- Patient name, date of birth, address, phone, email
- National ID numbers (SSN), medical record numbers
- Diagnoses, medications, lab results, imaging
- Insurance policy and claim details, appointment and admission records
- Any combination of the above

## Common Leak Vectors — NEVER do these

**Error messages:** Never include patient-identifying data in errors thrown to the client. Log details server-side only.

**Console output:** Never log full patient objects. Use opaque internal record IDs (UUIDs) — not medical record numbers, names, or national IDs.

**URL parameters:** Never put patient-identifying data in query strings or path segments. Use opaque UUIDs only.

**Browser storage:** Never store PHI in localStorage or sessionStorage. Keep PHI in memory only, fetch on demand.

**Logs and monitoring:** Never log full patient records. Sanitize stack traces before sending to error tracking services.

## Audit Trail

Every PHI access or modification must be logged:

```typescript
interface AuditEntry {
  timestamp: string;
  user_id: string;
  patient_id: string;
  action: "create" | "read" | "update" | "delete" | "print" | "export";
  resource_type: string;
  resource_id: string;
  changes?: { before: object; after: object };
  session_id: string;
}
```

## Safe vs Unsafe Error Handling

```typescript
// BAD — leaks PHI in error
throw new Error(`Patient ${patient.name} not found in ${patient.facility}`);

// GOOD — generic error, details logged server-side with opaque IDs only
logger.error("Patient lookup failed", { recordId: patient.id, facilityId });
throw new Error("Record not found");
```

## Safe Logging

```typescript
// BAD — logs identifiable patient data
console.log("Processing patient:", patient);

// GOOD — logs only opaque internal record ID
console.log("Processing record:", patient.id);
```

## Deployment Checklist

Before every deployment:

- [ ] No PHI in error messages or stack traces
- [ ] No PHI in console.log / console.error
- [ ] No PHI in URL parameters
- [ ] No PHI in browser storage
- [ ] Audit trail for all data access and modifications
- [ ] API authentication on all PHI endpoints
