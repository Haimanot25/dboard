export type ApiFormat = "openai-chat" | "gemini-content" | "anthropic-messages";

export type AuthType = "header-bearer" | "header-x-api-key" | "query-key" | "none";

export interface ProviderDefinition {
  id: string;
  name: string;
  apiFormat: ApiFormat;
  defaultBaseUrl: string;
  authType: AuthType;
  defaultModels: { modelId: string; displayName: string }[];
}

export const BUILT_IN_PROVIDERS: ProviderDefinition[] = [
  {
    id: "chatgpt",
    name: "ChatGPT / OpenAI",
    apiFormat: "openai-chat",
    defaultBaseUrl: "https://api.openai.com/v1",
    authType: "header-bearer",
    defaultModels: [
      { modelId: "gpt-4o", displayName: "GPT-4o" },
      { modelId: "gpt-4o-mini", displayName: "GPT-4o Mini" },
      { modelId: "gpt-4-turbo", displayName: "GPT-4 Turbo" },
      { modelId: "o3-mini", displayName: "o3-mini" },
    ],
  },
  {
    id: "groq",
    name: "Groq (Free)",
    apiFormat: "openai-chat",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    authType: "header-bearer",
    defaultModels: [
      { modelId: "openai/gpt-oss-120b", displayName: "GPT-OSS 120B" },
      { modelId: "llama3-70b-8192", displayName: "Llama 3 70B" },
      { modelId: "llama3-8b-8192", displayName: "Llama 3 8B" },
      { modelId: "mixtral-8x7b-32768", displayName: "Mixtral 8x7B" },
      { modelId: "gemma2-9b-it", displayName: "Gemma 2 9B" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    apiFormat: "gemini-content",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    authType: "query-key",
    defaultModels: [
      { modelId: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
      { modelId: "gemini-2.0-flash-lite", displayName: "Gemini 2.0 Flash Lite" },
      { modelId: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    apiFormat: "openai-chat",
    defaultBaseUrl: "http://localhost:11434",
    authType: "none",
    defaultModels: [
      { modelId: "llama3", displayName: "Llama 3" },
      { modelId: "llama3.1", displayName: "Llama 3.1" },
      { modelId: "mistral", displayName: "Mistral" },
      { modelId: "codellama", displayName: "CodeLlama" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    apiFormat: "openai-chat",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    authType: "header-bearer",
    defaultModels: [
      { modelId: "openai/gpt-4o-mini", displayName: "GPT-4o Mini" },
      { modelId: "openai/gpt-4o", displayName: "GPT-4o" },
      { modelId: "anthropic/claude-3.5-sonnet", displayName: "Claude 3.5 Sonnet" },
      { modelId: "meta-llama/llama-3.3-70b-instruct", displayName: "Llama 3.3 70B" },
      { modelId: "deepseek/deepseek-chat", displayName: "DeepSeek Chat" },
    ],
  },
];

export function getProviderDef(id: string): ProviderDefinition | undefined {
  return BUILT_IN_PROVIDERS.find((p) => p.id === id);
}
