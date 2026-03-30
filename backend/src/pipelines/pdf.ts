import fs from "fs";

export type PdfExtract = {
  text: string;
  confidence: number;
};

/**
 * Text extraction from digital PDFs. Scanned pages may return little text — surfaced via confidence.
 */
export async function extractTextFromPdf(filePath: string): Promise<PdfExtract> {
  const buf = fs.readFileSync(filePath);
  const pdfParse = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text: string }>;
  const res = await pdfParse(buf);
  const text = (res.text ?? "").replace(/\s+\n/g, "\n").trim();
  const len = text.length;
  const confidence = len < 80 ? 0.35 : len < 400 ? 0.55 : 0.75;
  return { text, confidence };
}
