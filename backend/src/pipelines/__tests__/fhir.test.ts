import { extractFromFhirJson } from "../fhir";

describe("extractFromFhirJson", () => {
  it("returns Invalid for non-JSON", () => {
    const r = extractFromFhirJson("not json");
    expect(r.resourceType).toBe("Invalid");
    expect(r.narrative).toMatch(/parse/i);
  });

  it("extracts Patient name from Bundle", () => {
    const json = JSON.stringify({
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            name: [{ family: "Doe", given: ["Jane"] }],
          },
        },
      ],
    });
    const r = extractFromFhirJson(json);
    expect(r.resourceType).toBe("Bundle");
    expect(r.patientLabel).toContain("Jane");
    expect(r.patientLabel).toContain("Doe");
  });
});
