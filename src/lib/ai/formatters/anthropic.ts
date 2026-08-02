import { assertPublicUrl } from "@/lib/db/ssrf-guard";

export async function callAnthropicMessages(
  baseUrl: string,
  model: string,
  apiKey: string | null,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (!apiKey) throw new Error("API key required for Anthropic");

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/messages`;
  await assertPublicUrl(endpoint);

  const res = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic request failed (${res.status}): ${res.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}
