import { describe, it, expect } from "vitest";
import { validateCsrf } from "./csrf";

function makeRequest(headers: Record<string, string>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Request("http://localhost:3000/api/test", { headers }) as any;
}

describe("csrf", () => {
  it("allows request with matching origin and host", () => {
    const req = makeRequest({ origin: "http://localhost:3000", host: "localhost:3000" });
    expect(validateCsrf(req)).toBe(true);
  });

  it("blocks request with mismatched origin", () => {
    const req = makeRequest({ origin: "http://evil.com", host: "localhost:3000" });
    expect(validateCsrf(req)).toBe(false);
  });

  it("blocks request with no origin even with csrf token", () => {
    const req = makeRequest({ host: "localhost:3000", "x-csrf-token": "valid-token" });
    expect(validateCsrf(req)).toBe(false);
  });

  it("blocks request with no origin and no csrf token", () => {
    const req = makeRequest({ host: "localhost:3000" });
    expect(validateCsrf(req)).toBe(false);
  });

  it("blocks request with invalid origin URL", () => {
    const req = makeRequest({ origin: "not-a-url", host: "localhost:3000" });
    expect(validateCsrf(req)).toBe(false);
  });

  it("blocks request with origin present but token present (origin takes precedence)", () => {
    const req = makeRequest({ origin: "http://evil.com", host: "localhost:3000", "x-csrf-token": "valid" });
    expect(validateCsrf(req)).toBe(false);
  });

  it("handles missing host header", () => {
    const req = makeRequest({ origin: "http://localhost:3000" });
    expect(validateCsrf(req)).toBe(false);
  });
});
