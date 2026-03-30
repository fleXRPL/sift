# Security and compliance

Sift is built as a **local-first** tool. This page describes the security posture, data handling, and **non-medical** disclaimers. It is **not** legal or clinical compliance advice.

## Threat model (summary)

- **Primary goal:** Keep clinical artifacts on the **local machine** (or office-controlled storage) and avoid accidental cloud exfiltration in default configurations.
- **Network exposure:** The orchestrator binds to **127.0.0.1** only. It is not intended to be reachable from other machines without explicit additional configuration (which this project does not provide).
- **Optional LLM:** When enabled, data is sent to whatever **OpenAI-compatible server** you configure (typically another process on the same host). You are responsible for that server’s security and data handling.

## Data at rest

- **SQLite** (`sift.db`) stores document metadata, extracted previews, summaries, and settings (including watch folder paths).
- Protect the **data directory** with normal OS access controls (user permissions, full-disk encryption, device policies).

## Data in transit

- **Loopback HTTP** between the UI, Tauri host, and Node orchestrator.
- **Loopback HTTP** to your local LLM if configured.

## HIPAA and regulated environments

Sift does **not** by itself make an environment HIPAA-compliant. Compliance depends on:

- How and where you deploy hardware and OS
- Policies, access control, training, BAAs where applicable
- Configuration of any **LLM or analytics** components you attach

Use this software under your organization’s policies and risk assessments.

## Clinical use disclaimer

Output from Sift (including LLM-generated text) may be **inaccurate or incomplete**. It is **not** a substitute for professional medical judgment, diagnosis, or treatment. Clinicians must verify information against source records and applicable standards of care.

## Reporting security issues

If you discover a security vulnerability, report it according to the repository’s security policy (for example GitHub **Security** advisories) once published.

## Related docs

- [Architecture](ARCHITECTURE.md)
- [Configuration](CONFIGURATION.md)
