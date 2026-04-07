# Sample records

Three realistic (fictional) clinical records for testing Sift end-to-end.
All patient names, dates, and values are entirely fabricated.

| File                       | Format           | What it contains                                                                                                   |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `patient-fhir-bundle.json` | FHIR R4 Bundle   | Patient demographics, 3 active conditions, 3 medications, 3 lab observations (A1c, creatinine, BP), 1 allergy      |
| `lab-result-hl7.hl7`       | HL7 v2.5 ORU^R01 | Comprehensive metabolic panel with critical eGFR, elevated HbA1c, and abnormal lipids — includes NTE warning notes |
| `referral-letter.txt`      | Plain text       | Cardiology referral letter for a complex patient with new wall motion abnormality, reduced EF, and elevated BNP    |

## How to test

1. Start the app: `node sift.mjs run`
2. Open **Settings** → pick any folder as your **Records folder** (or create a
   dedicated test folder).
3. Copy one or more files from this `samples/` directory into that folder:

   ```bash
   cp samples/patient-fhir-bundle.json ~/your-watch-folder/
   cp samples/lab-result-hl7.hl7      ~/your-watch-folder/
   cp samples/referral-letter.txt     ~/your-watch-folder/
   ```

4. Switch to the **Documents** tab — each file should appear within a few
   seconds as the watcher picks it up.
5. Click a document to see the **clinical synthesis** (LLM summary) and the
   **extracted context** (what was passed to the model).
6. Hit **Print report** to get a printable clinical brief.

## What good output looks like

**FHIR bundle** — Sift should extract patient name, DOB, active diagnoses
(T2DM, hypertension, CKD stage 3), current medications, and recent labs (A1c
8.9%, creatinine 1.8, BP 148/92). The LLM summary should note the poorly
controlled diabetes and the nephrology recommendation.

**HL7 lab result** — Sift should parse the OBX segments and surface the
critical eGFR (36), elevated HbA1c (9.2%), and abnormal lipids. The NTE
fields contain clinical comments that the model will incorporate.

**Referral letter** — plain text, so extraction relies entirely on the LLM.
The summary should capture the new inferior hypokinesis, reduced LVEF (45%),
elevated BNP, and the direct admission plan.
