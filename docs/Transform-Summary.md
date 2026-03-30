# Transform Summary

This "Windows Medical Office" strategy document outlines how to transform HealthWeave from a manual web app into an automated, local-first utility for clinical environments.

---

## HealthWeave: Windows Office Strategy & Architecture

### 1. The "Zero-Click" Workflow

In a medical office, speed is the only metric that matters. The app should not be a destination; it should be a **background processor**.

- **Folder Watcher:** Use the `tauri-plugin-fs-watch` to monitor a specific directory (e.g., `C:\EHR_Exports\`).
- **Automatic Ingestion:** When a file is dropped into the folder, HealthWeave automatically identifies the format (FHIR vs. PDF), processes it, and saves a summary to the local SQLite database.
- **System Tray Utility:** The app runs in the Windows tray. A small toast notification appears when a new clinical synthesis is ready for review.

---

## 2. Handling the Data "Mess"

Medical offices deal with a mix of modern and legacy data. Your local Node.js sidecar will handle three specific pipelines:

### A. The Modern Pipeline (FHIR JSON/XML)

- **Standard:** Use the `fhir.resources` (or equivalent JS library) to parse structured data.
- **Advantage:** This provides 100% accuracy for vitals, medications, and allergies.
- **LLM Role:** The LLM acts as a "Medical Narrator," turning the raw JSON into a human-readable clinical story.

### B. The Legacy Pipeline (Unstructured PDFs)

- **The Engine:** Use **Docling** or **Tesseract.js** (bundled locally) for OCR on scanned records.
- **The Moat:** Unlike cloud AI, your local app can handle "Multi-Pass" extraction—using one small model to extract text and a larger model to interpret the clinical significance.
- **Confidence Scores:** Every extracted value must show a "Confidence Score" to the doctor to ensure safety.

### C. The HL7 v2 Pipeline (Pipe-Delimited)

- **Format:** `MSH|^~\&|EPIC|...`
- **Handling:** Use a simple parser to turn these into temporary JSON objects for the LLM to summarize.

---

## 3. Local-First Infrastructure (The "Tauri" Bundle)

| Component          | Technology          | Windows Benefit                                                |
| :----------------- | :------------------ | :------------------------------------------------------------- |
| **GUI Wrapper**    | **Tauri v2**        | Uses native **WebView2** (pre-installed on Win 10/11).         |
| **Database**       | **SQLite**          | A single `.db` file in `AppData`. Easy to back up or move.     |
| **Backend Engine** | **Node.js Sidecar** | Bundled as an `.exe` using `pkg`. No Node installation needed. |
| **AI Inference**   | **llama-server**    | Compiled for Windows CPU/GPU. No Ollama app required.          |

---

## 4. Implementation Checklist for Your Wiki

### Phase 1: The Windows "Sidecar" Setup

1. **Bundle `llama-server.exe`:** Download the latest `llama.cpp` Windows release and place it in `src-tauri/binaries/llama-server-x86_64-pc-windows-msvc.exe`.

2. **Configure `tauri.conf.json`:**

   ```json
   "bundle": {
     "externalBin": ["binaries/llama-server", "binaries/healthweave-backend"]
   }
   ```

### Phase 2: The "Watch" Logic

1. Add a "Settings" tab in the UI where the user selects their "Records Folder."
2. In the Rust core, initialize the `notify` crate or Tauri plugin to trigger an event on `FileCreated`.

### Phase 3: The "Print-Ready" Output

1. Since doctors live in paper/PDFs, use **Tailwind Print Classes** to ensure that when they hit `Ctrl+P`, the report looks like a professional medical document, not a website screenshot.
