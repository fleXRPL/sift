import { extractFromHl7, looksLikeHl7 } from "../hl7";

describe("looksLikeHl7", () => {
  it("detects MSH header", () => {
    expect(looksLikeHl7("MSH|^~\\&|EPIC\rPID|1||123")).toBe(true);
  });

  it("rejects random text", () => {
    expect(looksLikeHl7("hello world")).toBe(false);
  });
});

describe("extractFromHl7", () => {
  it("parses segment list and PID", () => {
    const msg = ["MSH|^~\\&|EPIC|HOSP|LAB|FAC|20240101||ORU^R01|1|P|2.5", "PID|1||MRN12345^^^MRN||Doe^Jane"].join(
      "\r",
    );
    const r = extractFromHl7(msg);
    expect(r.segments.length).toBeGreaterThan(0);
    expect(r.narrative).toContain("HL7");
  });
});
