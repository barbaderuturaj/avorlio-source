import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { generateServicePages } from "../../../src/lib/landing/service-pages-generator";
import { validateSiteTree, serviceSlug } from "../../../src/lib/landing/r1-site-tree";

const gridServices = [
  { id: "s1", name: "Outdoor Structures", description: "Pergolas." },
  { id: "s2", name: "Irrigation and Drainage", description: "Sprinklers." },
];
function client(json: unknown) {
  return { messages: { create: async () => ({ content: [{ type: "text", text: JSON.stringify(json) }] }) } };
}
function rawClient(text: string) {
  return { messages: { create: async () => ({ content: text ? [{ type: "text", text }] : [] }) } };
}
const fakePhoto = async () => ({ src: "https://images.unsplash.com/p?w=1600", alt: "x" });
const facts = { business_name: "Acme", city: "Dallas", state: "TX", testimonials: [] } as never;

describe("generateServicePages", () => {
  test("one page per real service, slug = serviceSlug(name), valid + photo'd", async () => {
    const pages = await generateServicePages({
      gridServices, facts, vertical: "landscaping", archetype: "editorial-warm", byokKey: "x",
      anthropicClient: client({ servicePages: [
        { name: "Outdoor Structures", summary: "Custom builds.", body: [{ kind: "paragraph", text: "We build pergolas." }], ctaLabel: "Plan yours" },
        { name: "Irrigation and Drainage", summary: "Stay green.", body: [{ kind: "paragraph", text: "We zone systems." }], ctaLabel: "Get an estimate" },
      ] }),
      photoResolver: fakePhoto as never,
    });
    assert.equal(pages.length, 2);
    assert.equal(pages[0].slug, serviceSlug("Outdoor Structures"));
    assert.equal(pages[1].slug, serviceSlug("Irrigation and Drainage"));
    assert.ok(pages[0].heroPhoto?.src);
    const res = validateSiteTree({ servicePages: pages } as never);
    assert.equal(res.valid, true, JSON.stringify(res.errors));
  });

  test("drops any LLM service not in the real grid (no fabrication)", async () => {
    const pages = await generateServicePages({
      gridServices: [gridServices[0]], facts, vertical: "landscaping", archetype: "editorial-warm", byokKey: "x",
      anthropicClient: client({ servicePages: [
        { name: "Outdoor Structures", summary: "ok", body: [{ kind: "paragraph", text: "x" }], ctaLabel: "go" },
        { name: "Pool Installation", summary: "nope", body: [{ kind: "paragraph", text: "x" }], ctaLabel: "go" },
      ] }),
      photoResolver: fakePhoto as never,
    });
    assert.equal(pages.length, 1);
    assert.equal(pages[0].name, "Outdoor Structures");
  });

  test("returns deterministic pages on an empty model response", async () => {
    const pages = await generateServicePages({
      gridServices: [{ id: "hvac-1", name: "AC Repair and Maintenance", description: "Reliable AC repair." }],
      facts, vertical: "hvac", archetype: "editorial-warm", byokKey: "x",
      anthropicClient: rawClient(""),
      photoResolver: fakePhoto as never,
    });
    assert.equal(pages.length, 1);
    assert.equal(pages[0].slug, serviceSlug("AC Repair and Maintenance"));
    assert.equal(pages[0].name, "AC Repair and Maintenance");
    assert.equal(pages[0].summary, "Reliable AC repair.");
    assert.deepEqual(pages[0].body, [{ kind: "paragraph", text: "Reliable AC repair." }]);
    assert.equal(pages[0].ctaLabel, "Get a free estimate");
    assert.equal(validateSiteTree({ servicePages: pages }).valid, true);
  });

  test("returns deterministic pages on invalid JSON", async () => {
    const pages = await generateServicePages({
      gridServices, facts, vertical: "landscaping", archetype: "editorial-warm", byokKey: "x",
      anthropicClient: rawClient("not json"),
      photoResolver: fakePhoto as never,
    });
    assert.equal(pages.length, gridServices.length);
    assert.deepEqual(pages.map((p) => p.name), gridServices.map((s) => s.name));
    assert.deepEqual(pages.map((p) => p.summary), gridServices.map((s) => s.description));
    assert.equal(validateSiteTree({ servicePages: pages }).valid, true);
  });

  test("partial LLM output keeps rich content and fills omitted services", async () => {
    const pages = await generateServicePages({
      gridServices, facts, vertical: "landscaping", archetype: "editorial-warm", byokKey: "x",
      anthropicClient: client({ servicePages: [
        { name: "Outdoor Structures", summary: "Rich generated summary.", body: [{ kind: "heading", text: "A richer page" }], ctaLabel: "Plan yours" },
      ] }),
      photoResolver: fakePhoto as never,
    });
    assert.equal(pages.length, gridServices.length);
    assert.equal(pages[0].summary, "Rich generated summary.");
    assert.deepEqual(pages[0].body, [{ kind: "heading", text: "A richer page" }]);
    assert.equal(pages[1].summary, gridServices[1].description);
    assert.deepEqual(pages[1].body, [{ kind: "paragraph", text: gridServices[1].description }]);
    assert.equal(pages[1].slug, serviceSlug(gridServices[1].name));
    const res = validateSiteTree({ servicePages: pages });
    assert.equal(res.valid, true, JSON.stringify(res.errors));
  });
});
