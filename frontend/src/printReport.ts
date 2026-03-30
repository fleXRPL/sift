import type { DocumentDetail } from "./api";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Opens the system print dialog with a readable, high-contrast document.
 * Uses a hidden iframe so printing works reliably in Tauri/WebKit (main window `print()` is often a no-op).
 */
export function printClinicalReport(d: DocumentDetail): void {
  const title = escapeHtml(d.file_name);
  const meta = escapeHtml(
    `${d.source_type} · ${new Date(d.created_at).toLocaleString()}${
      d.confidence != null ? ` · Confidence ${Math.round(d.confidence * 100)}%` : ""
    }`,
  );
  const summary = escapeHtml(d.summary_text ?? "No summary available.");
  const err = d.error_message ? `<p class="err">${escapeHtml(d.error_message)}</p>` : "";
  const raw = escapeHtml((d.raw_preview ?? "").slice(0, 16000));

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; padding: 24px; color: #0f172a; max-width: 52rem; margin: 0 auto; line-height: 1.5; }
  h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 8px; color: #020617; }
  .meta { color: #475569; font-size: 0.8125rem; margin-bottom: 20px; }
  h2 { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin: 20px 0 8px; }
  .summary { white-space: pre-wrap; font-size: 0.9375rem; color: #1e293b; }
  pre { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 0.75rem; color: #334155; white-space: pre-wrap; word-break: break-word; max-height: 50vh; overflow: auto; }
  .err { color: #b91c1c; font-size: 0.875rem; margin-top: 12px; }
  @media print { body { padding: 12px; } pre { max-height: none; } }
</style></head><body>
  <h1>${title}</h1>
  <div class="meta">${meta}</div>
  <h2>Clinical synthesis</h2>
  <div class="summary">${summary}</div>
  ${err}
  <h2>Extracted context (preview)</h2>
  <pre>${raw}</pre>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 400);
    }
  }, 0);
}
