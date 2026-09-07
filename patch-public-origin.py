from pathlib import Path

# ---------------------------------------------------------
# 1. CHATBOT: reuse the same public-origin resolver that the
#    booking page already uses instead of rebuilding Host/Proto
#    independently (which was leaking internal :3000).
# ---------------------------------------------------------
p = Path(r"packages/crm/src/lib/agents/public-embed.ts")
s = p.read_text(encoding="utf-8")

old_import = '''import { sanitizeChatbotEmbedUrl } from "@/lib/landing/factual-grounding";'''
new_import = '''import { sanitizeChatbotEmbedUrl } from "@/lib/landing/factual-grounding";
import { requestOriginFromHeaders } from "@/lib/bookings/public-booking-url";'''

if old_import not in s:
    raise SystemExit("public-embed import anchor not found")

s = s.replace(old_import, new_import, 1)

old_block = '''    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
    if (!host) return null;
    const safeUrl = sanitizeChatbotEmbedUrl(record.embedUrl, `${protocol}://${host}`);
    return safeUrl ? { ...record, embedUrl: safeUrl } : null;'''

new_block = '''    const requestOrigin = requestOriginFromHeaders(await headers());
    if (!requestOrigin) return null;
    const safeUrl = sanitizeChatbotEmbedUrl(record.embedUrl, requestOrigin);
    return safeUrl ? { ...record, embedUrl: safeUrl } : null;'''

if old_block not in s:
    raise SystemExit("public-embed origin block not found")

s = s.replace(old_block, new_block, 1)
p.write_text(s, encoding="utf-8")


# ---------------------------------------------------------
# 2. BOOKING: temporary public tunnels are app-origin hosts,
#    not workspace custom domains. They must retain orgSlug:
#    /book/{orgSlug}/{bookingSlug}
# ---------------------------------------------------------
p = Path(r"packages/crm/src/lib/bookings/public-booking-url.ts")
s = p.read_text(encoding="utf-8")

old = '''  const localOrAppHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === base;

  if (localOrAppHost) {'''

new = '''  const tunnelHost =
    hostname.endsWith(".trycloudflare.com") ||
    hostname.endsWith(".ngrok-free.dev") ||
    hostname.endsWith(".ngrok-free.app");

  const localOrAppHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === base ||
    tunnelHost;

  if (localOrAppHost) {'''

if old not in s:
    raise SystemExit("public-booking host block not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: public booking + chatbot origin patch applied")
