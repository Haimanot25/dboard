import { assertPublicUrl } from "@/lib/db/ssrf-guard";

export async function callGeminiContent(
  baseUrl: string,
  model: string,
  apiKey: string | null,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/models/${model}:generateContent`);
  await assertPublicUrl(url.toString());

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["x-goog-api-key"] = apiKey;
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${res.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
