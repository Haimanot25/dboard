import { assertPublicUrl } from "@/lib/db/ssrf-guard";

export async function callOpenAIChat(
  baseUrl: string,
  model: string,
  apiKey: string | null,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  await assertPublicUrl(endpoint);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${res.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
