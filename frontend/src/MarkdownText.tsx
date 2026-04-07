/**
 * Lightweight markdown renderer for LLM clinical output.
 * Handles the subset that models actually produce: headings, bold, italic,
 * bullet/numbered lists, and plain paragraphs. No external dependencies.
 */

import type { ReactNode } from "react";

type Props = Readonly<{ children: string }>;

const INLINE_RE = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;

function inlineFormat(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  INLINE_RE.lastIndex = 0;
  let m = INLINE_RE.exec(text);
  while (m !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={key++} className="font-semibold text-slate-800">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(<em key={key++}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
    m = INLINE_RE.exec(text);
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function headingClass(level: number): string {
  if (level === 1) return "text-base font-bold text-slate-800 mt-3 mb-1";
  if (level === 2) return "text-sm font-bold text-slate-700 mt-2 mb-0.5";
  return "text-xs font-semibold uppercase tracking-wide text-clinical-sage mt-2 mb-0.5";
}

const HEADING_RE = /^(#{1,3})\s+(.+)/;
const UL_RE = /^[-*•]\s+(.*)/;
const OL_RE = /^\d+\.\s+(.*)/;

export function MarkdownText({ children }: Props) {
  const lines = children.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    const items = listItems.splice(0);
    if (listType === "ol") {
      nodes.push(<ol key={key++} className="list-decimal list-inside space-y-0.5 my-1 text-slate-700">{items}</ol>);
    } else {
      nodes.push(<ul key={key++} className="list-disc list-inside space-y-0.5 my-1 text-slate-700">{items}</ul>);
    }
    listType = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushList();
      continue;
    }

    const hMatch = HEADING_RE.exec(line);
    if (hMatch) {
      flushList();
      nodes.push(<p key={key++} className={headingClass(hMatch[1].length)}>{inlineFormat(hMatch[2])}</p>);
      continue;
    }

    const ulMatch = UL_RE.exec(line);
    if (ulMatch) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(<li key={key++}>{inlineFormat(ulMatch[1])}</li>);
      continue;
    }

    const olMatch = OL_RE.exec(line);
    if (olMatch) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(<li key={key++}>{inlineFormat(olMatch[1])}</li>);
      continue;
    }

    flushList();
    nodes.push(<p key={key++} className="my-1 text-slate-700 leading-relaxed">{inlineFormat(line)}</p>);
  }

  flushList();
  return <div className="text-sm space-y-0.5">{nodes}</div>;
}
