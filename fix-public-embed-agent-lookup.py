from pathlib import Path

p = Path(r"packages/crm/src/app/api/v1/public/agent/[slug]/embed.js/route.ts")
s = p.read_text(encoding="utf-8")

old = '''import { eq } from "drizzle-orm";'''
new = '''import { and, eq } from "drizzle-orm";'''

if old not in s:
    raise SystemExit("drizzle import anchor not found")
s = s.replace(old, new, 1)

old = '''    .where(eq(organizations.slug, orgSlugPart))
    .limit(1);'''

new = '''    .where(
      and(
        eq(organizations.slug, orgSlugPart),
        eq(agents.slug, agentSlugPart),
      ),
    )
    .limit(1);'''

if old not in s:
    raise SystemExit("agent lookup anchor not found")
s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")
print("PASS: embed lookup now filters by organization + requested agent slug")
