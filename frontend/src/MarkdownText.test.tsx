import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MarkdownText } from "./MarkdownText";

afterEach(() => cleanup());

function q(container: HTMLElement, selector: string) {
  return container.querySelector(selector);
}
function qa(container: HTMLElement, selector: string) {
  return container.querySelectorAll(selector);
}

describe("MarkdownText", () => {
  // ── Plain text ─────────────────────────────────────────────────────────────

  it("renders plain text as a paragraph", () => {
    const { container } = render(<MarkdownText>Hello world</MarkdownText>);
    expect(container.textContent).toContain("Hello world");
  });

  it("renders multiple lines as separate paragraphs", () => {
    const { container } = render(<MarkdownText>{"Line one\nLine two"}</MarkdownText>);
    expect(container.textContent).toContain("Line one");
    expect(container.textContent).toContain("Line two");
  });

  // ── Bold / italic ──────────────────────────────────────────────────────────

  it("renders **text** as bold", () => {
    const { container } = render(<MarkdownText>{"**Patient:** Alice"}</MarkdownText>);
    const strong = q(container, "strong");
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe("Patient:");
  });

  it("renders *text* as italic", () => {
    const { container } = render(<MarkdownText>{"*Note:* important"}</MarkdownText>);
    const em = q(container, "em");
    expect(em).toBeTruthy();
    expect(em?.textContent).toBe("Note:");
  });

  it("handles multiple inline markers on one line", () => {
    const { container } = render(<MarkdownText>{"**A** and **B** are **bold**"}</MarkdownText>);
    const strongs = qa(container, "strong");
    expect(strongs).toHaveLength(3);
    expect(strongs[0].textContent).toBe("A");
    expect(strongs[1].textContent).toBe("B");
    expect(strongs[2].textContent).toBe("bold");
  });

  // ── Headings ───────────────────────────────────────────────────────────────

  it("renders # as a level-1 heading paragraph", () => {
    const { container } = render(<MarkdownText>{"# Summary"}</MarkdownText>);
    expect(container.textContent).toContain("Summary");
  });

  it("renders ## as a level-2 heading paragraph", () => {
    const { container } = render(<MarkdownText>{"## Medications"}</MarkdownText>);
    expect(container.textContent).toContain("Medications");
  });

  it("renders ### as a level-3 heading paragraph", () => {
    const { container } = render(<MarkdownText>{"### Observations"}</MarkdownText>);
    expect(container.textContent).toContain("Observations");
  });

  it("allows bold inside a heading", () => {
    const { container } = render(<MarkdownText>{"## **Active** Conditions"}</MarkdownText>);
    const strong = q(container, "strong");
    expect(strong?.textContent).toBe("Active");
  });

  // ── Unordered lists ────────────────────────────────────────────────────────

  it("renders * items as an unordered list", () => {
    const { container } = render(<MarkdownText>{"* Metformin\n* Lisinopril\n* Atorvastatin"}</MarkdownText>);
    const items = qa(container, "ul li");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("Metformin");
    expect(items[2].textContent).toBe("Atorvastatin");
  });

  it("renders - items as an unordered list", () => {
    const { container } = render(<MarkdownText>{"- First\n- Second"}</MarkdownText>);
    const items = qa(container, "ul li");
    expect(items).toHaveLength(2);
  });

  it("renders list items with bold inline content", () => {
    const { container } = render(<MarkdownText>{"* **Diagnosis:** T2DM"}</MarkdownText>);
    const strong = q(container, "li strong");
    expect(strong?.textContent).toBe("Diagnosis:");
  });

  // ── Ordered lists ──────────────────────────────────────────────────────────

  it("renders 1. 2. items as an ordered list", () => {
    const { container } = render(<MarkdownText>{"1. First step\n2. Second step\n3. Third step"}</MarkdownText>);
    const items = qa(container, "ol li");
    expect(items).toHaveLength(3);
    expect(items[1].textContent).toBe("Second step");
  });

  // ── Blank line handling ────────────────────────────────────────────────────

  it("blank lines flush lists so two adjacent lists are independent", () => {
    const { container } = render(<MarkdownText>{"* A\n* B\n\n* C\n* D"}</MarkdownText>);
    const lists = qa(container, "ul");
    expect(lists).toHaveLength(2);
  });

  // ── Realistic LLM output ───────────────────────────────────────────────────

  it("renders a realistic clinical synthesis without raw markdown characters", () => {
    const synthesis = [
      "**Patient:** Margaret Ann Hartwell",
      "**DOB:** 1958-03-14",
      "",
      "**Active Conditions**",
      "* **Type 2 Diabetes Mellitus:** Poorly controlled, A1c 8.9%",
      "* **Hypertension:** BP 148/92 mmHg",
      "* **CKD Stage 3:** eGFR 42, nephrology follow-up recommended",
      "",
      "**Current Medications**",
      "* Metformin 1000 mg twice daily",
      "* Lisinopril 10 mg once daily",
      "* Atorvastatin 40 mg at bedtime",
    ].join("\n");

    const { container } = render(<MarkdownText>{synthesis}</MarkdownText>);

    expect(container.textContent).not.toContain("**");
    expect(container.textContent).toContain("Margaret Ann Hartwell");
    expect(container.textContent).toContain("8.9%");
    expect(container.textContent).toContain("Lisinopril");
    expect(qa(container, "strong").length).toBeGreaterThan(0);
    expect(qa(container, "ul li").length).toBeGreaterThanOrEqual(3);
  });
});
