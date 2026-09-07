from pathlib import Path

p = Path(r"packages/crm/src/lib/landing/factual-grounding.ts")
s = p.read_text(encoding="utf-8")

old = '''      stored.protocol = request.protocol;
      stored.host = request.host;
      return stored.toString();'''

new = '''      stored.protocol = request.protocol;
      stored.hostname = request.hostname;
      stored.port = request.port;
      return stored.toString();'''

if old not in s:
    raise SystemExit("sanitizeChatbotEmbedUrl anchor not found")

s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

print("PASS: chatbot public-origin port fix applied")
