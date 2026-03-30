# Glossary

| Term                  | Meaning in Sift                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Orchestrator**      | The Node.js **Express** service that owns SQLite, ingest pipelines, and LLM calls.                                                        |
| **Host**              | The **Tauri** (Rust) process: window, tray, native folder watcher.                                                                        |
| **Watch folder**      | User-selected directory monitored by the host; new files trigger ingest.                                                                  |
| **Ingest**            | Processing a file path: detect format, extract text/context, persist summary.                                                             |
| **FHIR**              | Fast Healthcare Interoperability Resources; Sift handles JSON **Bundle**-style exports with lightweight parsing (not a full FHIR server). |
| **HL7 v2**            | Pipe-delimited messages (for example segments starting with `MSH\|`); minimal parsing for summarization.                                  |
| **OpenAI-compatible** | HTTP API shaped like OpenAI **chat completions** (`/v1/chat/completions`), used by many local servers.                                    |
| **Sidecar**           | Auxiliary binary shipped beside the main app (for example **`pkg`**’d Node backend or **`llama-server`**).                                |
| **Confidence**        | Score stored with a summary; higher when structured extraction is strong and/or LLM succeeded.                                            |
| **`sift.db`**         | SQLite database file containing settings and document records.                                                                            |
