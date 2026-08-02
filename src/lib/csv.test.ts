import { describe, it, expect } from "vitest";
import { sanitizeCell, quoteCsvField, csvRow } from "./csv";

describe("sanitizeCell", () => {
  it("neutralizes formula injection prefixes", () => {
    expect(sanitizeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(sanitizeCell("+cmd|'/C calc'!A0")).toBe("'+cmd|'/C calc'!A0");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCell("\t=1+1")).toBe("'\t=1+1");
    expect(sanitizeCell("\r=1+1")).toBe("'\r=1+1");
    expect(sanitizeCell("-2+3")).toBe("'-2+3");
  });

  it("leaves plain values untouched", () => {
    expect(sanitizeCell("hello")).toBe("hello");
    expect(sanitizeCell("42")).toBe("42");
    expect(sanitizeCell("-42")).toBe("-42");
    expect(sanitizeCell("-42.5")).toBe("-42.5");
    expect(sanitizeCell("1e5")).toBe("1e5");
    expect(sanitizeCell("name@example.com")).toBe("name@example.com");
    expect(sanitizeCell("0")).toBe("0");
  });

  it("handles null and undefined", () => {
    expect(sanitizeCell(null)).toBe("");
    expect(sanitizeCell(undefined)).toBe("");
  });
});

describe("quoteCsvField", () => {
  it("quotes fields with special characters", () => {
    expect(quoteCsvField("a,b")).toBe('"a,b"');
    expect(quoteCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(quoteCsvField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("leaves simple fields unquoted", () => {
    expect(quoteCsvField("plain")).toBe("plain");
    expect(quoteCsvField("with space")).toBe("with space");
  });
});

describe("csvRow", () => {
  it("joins and quotes all values", () => {
    expect(csvRow(["a", "b,c", "d"])).toBe('a,"b,c",d');
  });
});
