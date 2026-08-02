import { describe, it, expect, vi, afterEach } from "vitest";
import { isPrivateIP, isPrivateHostname, resolveAndValidateHost, assertPublicUrl } from "./ssrf-guard";

vi.mock("dns", () => {
  const promises = {
    resolve4: vi.fn(),
    resolve6: vi.fn(),
  };
  return {
    default: { promises },
    promises,
  };
});

import dns from "dns";

const mockedResolve4 = dns.promises.resolve4 as unknown as ReturnType<typeof vi.fn>;
const mockedResolve6 = dns.promises.resolve6 as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.ALLOW_PRIVATE_DB_HOSTS;
});

describe("isPrivateIP", () => {
  it("detects IPv4 private ranges", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("10.0.0.5")).toBe(true);
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("192.168.1.1")).toBe(true);
    expect(isPrivateIP("169.254.169.254")).toBe(true);
    expect(isPrivateIP("0.0.0.0")).toBe(true);
  });

  it("allows public IPv4", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("172.15.0.1")).toBe(false);
    expect(isPrivateIP("172.32.0.1")).toBe(false);
    expect(isPrivateIP("104.16.132.229")).toBe(false);
  });

  it("detects IPv6 private ranges", () => {
    expect(isPrivateIP("::1")).toBe(true);
    expect(isPrivateIP("::")).toBe(true);
    expect(isPrivateIP("fc00::1")).toBe(true);
    expect(isPrivateIP("fd12:3456::1")).toBe(true);
    expect(isPrivateIP("fe80::1")).toBe(true);
  });

  it("detects IPv4-mapped IPv6 addresses", () => {
    expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:192.168.1.1")).toBe(true);
    expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("isPrivateHostname", () => {
  it("detects localhost-style hostnames", () => {
    expect(isPrivateHostname("localhost")).toBe(true);
    expect(isPrivateHostname("foo.localhost")).toBe(true);
    expect(isPrivateHostname("10.0.0.1")).toBe(true);
    expect(isPrivateHostname("192.168.1.1")).toBe(true);
  });

  it("allows public hostnames", () => {
    expect(isPrivateHostname("db.example.com")).toBe(false);
    expect(isPrivateHostname("db.supabase.co")).toBe(false);
  });
});

describe("resolveAndValidateHost", () => {
  it("blocks localhost by default", async () => {
    const result = await resolveAndValidateHost("localhost");
    expect(result.valid).toBe(false);
  });

  it("blocks hosts resolving to private IPs", async () => {
    mockedResolve4.mockResolvedValue(["10.0.0.5"]);
    mockedResolve6.mockRejectedValue(new Error("no AAAA"));
    const result = await resolveAndValidateHost("internal-db.example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private/i);
  });

  it("blocks hosts resolving to IPv4-mapped private IPs", async () => {
    mockedResolve4.mockRejectedValue(new Error("no A"));
    mockedResolve6.mockResolvedValue(["::ffff:192.168.0.1"]);
    const result = await resolveAndValidateHost("mapped.example.com");
    expect(result.valid).toBe(false);
  });

  it("allows hosts resolving only to public IPs", async () => {
    mockedResolve4.mockResolvedValue(["93.184.216.34"]);
    mockedResolve6.mockRejectedValue(new Error("no AAAA"));
    const result = await resolveAndValidateHost("example.com");
    expect(result.valid).toBe(true);
  });

  it("fails closed when DNS cannot resolve", async () => {
    mockedResolve4.mockRejectedValue(new Error("ENOTFOUND"));
    mockedResolve6.mockRejectedValue(new Error("ENOTFOUND"));
    const result = await resolveAndValidateHost("unknown-host.invalid");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/resolve/i);
  });

  it("allows everything when ALLOW_PRIVATE_DB_HOSTS=1", async () => {
    process.env.ALLOW_PRIVATE_DB_HOSTS = "1";
    const result = await resolveAndValidateHost("localhost");
    expect(result.valid).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  it("rejects malformed URLs", async () => {
    await expect(assertPublicUrl("not-a-url")).rejects.toThrow("Invalid URL");
  });

  it("rejects non-http protocols", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow("Only http:// and https://");
    await expect(assertPublicUrl("ftp://example.com/x")).rejects.toThrow("Only http:// and https://");
  });

  it("rejects private hosts", async () => {
    await expect(assertPublicUrl("http://127.0.0.1:11434/")).rejects.toThrow(/private/i);
    await expect(assertPublicUrl("https://localhost:3000/hook")).rejects.toThrow(/private/i);
  });

  it("rejects hosts resolving to private IPs", async () => {
    mockedResolve4.mockResolvedValue(["10.0.0.5"]);
    mockedResolve6.mockRejectedValue(new Error("no AAAA"));
    await expect(assertPublicUrl("http://internal.example.com:8080/hook")).rejects.toThrow(/private/i);
  });

  it("accepts public URLs", async () => {
    mockedResolve4.mockResolvedValue(["93.184.216.34"]);
    mockedResolve6.mockRejectedValue(new Error("no AAAA"));
    await expect(assertPublicUrl("https://hooks.slack.com/services/xxx/yyy")).resolves.toBeUndefined();
  });

  it("respects ALLOW_PRIVATE_DB_HOSTS=1", async () => {
    process.env.ALLOW_PRIVATE_DB_HOSTS = "1";
    await expect(assertPublicUrl("http://localhost:11434/v1")).resolves.toBeUndefined();
  });
});
