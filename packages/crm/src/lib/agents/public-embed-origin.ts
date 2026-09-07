const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function firstHeaderValue(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.split(",", 1)[0]?.trim() ?? "";
  return value || null;
}

function validProtocol(value: string | null): "http:" | "https:" | null {
  if (!value) return null;
  const normalized = value.toLowerCase() === "http" ? "http:" : value.toLowerCase() === "https" ? "https:" : null;
  return normalized && HTTP_PROTOCOLS.has(normalized) ? normalized : null;
}

function validHost(value: string | null): string | null {
  if (!value || /[\r\n\s/@?#]/.test(value)) return null;
  try {
    const parsed = new URL(`http://${value}`);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    if (!parsed.hostname || parsed.port && (!/^\d+$/.test(parsed.port) || Number(parsed.port) > 65535)) return null;
    if (!/^(?:[a-z0-9-]+\.)*[a-z0-9-]+$|^localhost$|^127(?:\.\d{1,3}){3}$|^\[[0-9a-f:]+\]$/i.test(parsed.hostname)) return null;
    return parsed.host;
  } catch {
    return null;
  }
}

function isLocalHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Resolve the browser-visible origin, not the app's internal listener origin. */
export function resolvePublicEmbedOrigin(request: Request): string {
  let fallback: URL;
  try {
    fallback = new URL(request.url);
  } catch {
    fallback = new URL("http://localhost");
  }

  const forwardedHost = validHost(firstHeaderValue(request, "x-forwarded-host"));
  const requestHost = validHost(firstHeaderValue(request, "host"));
  const host = forwardedHost ?? requestHost ?? validHost(fallback.host) ?? "localhost";
  const forwardedProtocol = validProtocol(firstHeaderValue(request, "x-forwarded-proto"));
  const fallbackProtocol = validProtocol(fallback.protocol);
  const protocol = forwardedProtocol ?? (isLocalHost(host) ? "http:" : fallbackProtocol === "https:" ? "https:" : "https:");

  return `${protocol}//${host}`;
}
