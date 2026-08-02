import dns from "dns";

export function isPrivateIP(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIP(normalized.slice(7));
  }
  if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/.test(normalized)) return true;
  if (/^fc[0-9a-f]{2}:/i.test(normalized) || /^fd[0-9a-f]{2}:/i.test(normalized)) return true;
  if (/^fe8[0-9a-f]:/i.test(normalized)) return true;
  if (normalized === "::1" || normalized === "::" || normalized === "localhost") return true;
  return false;
}

export function isPrivateHostname(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return true;
  return false;
}

export async function resolveAndValidateHost(host: string): Promise<{ valid: boolean; error?: string }> {
  if (process.env.ALLOW_PRIVATE_DB_HOSTS === "1") return { valid: true };
  if (!host || isPrivateHostname(host)) {
    return { valid: false, error: "Connection to private/internal network addresses is not allowed" };
  }

  let resolved = false;
  try {
    const addresses = await dns.promises.resolve4(host);
    resolved = true;
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return { valid: false, error: "Connection to private/internal network addresses is not allowed" };
      }
    }
  } catch {
    // no A records
  }
  try {
    const addresses = await dns.promises.resolve6(host);
    resolved = true;
    for (const addr of addresses) {
      if (isPrivateIP(addr)) {
        return { valid: false, error: "Connection to private/internal network addresses is not allowed" };
      }
    }
  } catch {
    // no AAAA records
  }

  if (!resolved) {
    return { valid: false, error: "Could not resolve database host — connection blocked" };
  }
  return { valid: true };
}

/**
 * Validate a URL before the server fetches it (webhooks, AI providers, etc.).
 * Throws when the target resolves to a private/internal address unless
 * ALLOW_PRIVATE_DB_HOSTS=1 (needed for self-hosted LLMs / local webhook targets).
 */
export async function assertPublicUrl(urlString: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are allowed");
  }
  const check = await resolveAndValidateHost(url.hostname);
  if (!check.valid) {
    throw new Error(check.error || "Connection blocked");
  }
}
