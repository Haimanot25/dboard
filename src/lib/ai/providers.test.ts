import { describe, it, expect } from "vitest";
import { BUILT_IN_PROVIDERS, getProviderDef } from "./providers";

describe("ai/providers", () => {
  it("has all 5 built-in providers", () => {
    expect(BUILT_IN_PROVIDERS).toHaveLength(5);
  });

  it("has openrouter provider", () => {
    const p = getProviderDef("openrouter");
    expect(p).toBeDefined();
    expect(p?.apiFormat).toBe("openai-chat");
    expect(p?.authType).toBe("header-bearer");
    expect(p?.defaultBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(p?.defaultModels.length).toBeGreaterThan(0);
  });

  it("has chatgpt provider", () => {
    const p = BUILT_IN_PROVIDERS.find((x) => x.id === "chatgpt");
    expect(p).toBeDefined();
    expect(p?.name).toContain("OpenAI");
    expect(p?.apiFormat).toBe("openai-chat");
    expect(p?.authType).toBe("header-bearer");
    expect(p?.defaultModels.length).toBeGreaterThan(0);
  });

  it("has groq provider", () => {
    const p = BUILT_IN_PROVIDERS.find((x) => x.id === "groq");
    expect(p).toBeDefined();
    expect(p?.apiFormat).toBe("openai-chat");
  });

  it("has gemini provider", () => {
    const p = BUILT_IN_PROVIDERS.find((x) => x.id === "gemini");
    expect(p).toBeDefined();
    expect(p?.apiFormat).toBe("gemini-content");
    expect(p?.authType).toBe("query-key");
  });

  it("has ollama provider", () => {
    const p = BUILT_IN_PROVIDERS.find((x) => x.id === "ollama");
    expect(p).toBeDefined();
    expect(p?.authType).toBe("none");
  });

  describe("getProviderDef", () => {
    it("returns correct provider", () => {
      const p = getProviderDef("chatgpt");
      expect(p?.id).toBe("chatgpt");
    });

    it("returns undefined for unknown", () => {
      expect(getProviderDef("nonexistent")).toBeUndefined();
    });
  });
});
