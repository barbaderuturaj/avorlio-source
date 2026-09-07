from pathlib import Path

p = Path(r"packages/crm/tests/unit/agents/public-agent-embed-storage.spec.ts")
s = p.read_text(encoding="utf-8")

anchor = '''  test("updates stored conversation_id from JSON and streaming responses", () => {
    const source = readFileSync(embedRoutePath, "utf8");

    const persistCalls = source.match(/persistConversationId\\(json\\.conversation_id\\)|persistConversationId\\(data\\.conversation_id\\)/g) ?? [];
    assert.ok(
      persistCalls.length >= 3,
      `expected JSON start/done response paths to persist conversation ids, got ${persistCalls.length}`,
    );
  });'''

addition = anchor + '''

  test("looks up the requested agent slug inside the requested organization", () => {
    const source = readFileSync(embedRoutePath, "utf8");

    assert.match(source, /import \\{ and, eq \\} from "drizzle-orm"/);
    assert.match(source, /eq\\(organizations\\.slug, orgSlugPart\\)/);
    assert.match(source, /eq\\(agents\\.slug, agentSlugPart\\)/);

    // Regression: querying only by organization + LIMIT 1 can select an
    // unrelated draft agent and incorrectly return the no-op embed script.
    assert.doesNotMatch(
      source,
      /\\.where\\(eq\\(organizations\\.slug, orgSlugPart\\)\\)\\s*\\.limit\\(1\\)/,
    );
  });'''

if anchor not in s:
    raise SystemExit("embed test insertion anchor not found")

s = s.replace(anchor, addition, 1)
p.write_text(s, encoding="utf-8")

print("PASS: embed requested-agent regression test added")
