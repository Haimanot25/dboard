import { describe, it, expect, beforeEach } from "vitest";
import { encrypt, decrypt } from "./encryption";

describe("encryption", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key";
  });

  it("encrypts and decrypts text roundtrip", () => {
    const text = "postgresql://user:pass@localhost:5432/db";
    const encrypted = encrypt(text);
    expect(encrypted).not.toBe(text);
    expect(encrypted).toContain(":");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it("produces different ciphertext for same input (random IV)", () => {
    const text = "same-password";
    const e1 = encrypt(text);
    const e2 = encrypt(text);
    expect(e1).not.toBe(e2);
    expect(decrypt(e1)).toBe(text);
    expect(decrypt(e2)).toBe(text);
  });

  it("decrypts with wrong key throws", () => {
    const text = "secret data";
    const encrypted = encrypt(text);
    process.env.ENCRYPTION_KEY = "wrong-key";
    expect(() => decrypt(encrypted)).toThrow();
  });

  it("handles special characters", () => {
    const text = "p@ss!w0rd#&*{}[]|\\:;\"'<>,.?/`~";
    const encrypted = encrypt(text);
    expect(decrypt(encrypted)).toBe(text);
  });

  it("handles unicode characters", () => {
    const text = "数据库密码123日本語";
    const encrypted = encrypt(text);
    expect(decrypt(encrypted)).toBe(text);
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY environment variable is required");
  });

  it("decrypt rejects empty string", () => {
    expect(() => decrypt("")).toThrow("Invalid encrypted text");
  });

  it("decrypt rejects non-string input", () => {
    expect(() => decrypt(null as unknown as string)).toThrow("Invalid encrypted text");
    expect(() => decrypt(undefined as unknown as string)).toThrow("Invalid encrypted text");
    expect(() => decrypt(123 as unknown as string)).toThrow("Invalid encrypted text");
  });

  it("decrypt rejects malformed ciphertext (wrong number of parts)", () => {
    expect(() => decrypt("only-one-part")).toThrow("expected 3 colon-separated parts");
    expect(() => decrypt("a:b")).toThrow("expected 3 colon-separated parts");
    expect(() => decrypt("a:b:c:d")).toThrow("expected 3 colon-separated parts");
  });

  it("decrypt rejects ciphertext with empty parts", () => {
    expect(() => decrypt(":authTag:ciphertext")).toThrow("empty iv");
    expect(() => decrypt("iv::ciphertext")).toThrow("empty iv");
    expect(() => decrypt("iv:authTag:")).toThrow("empty iv");
  });
});
