import { test } from "node:test";
import assert from "node:assert/strict";

import { renderCalcomMonthV1 } from "@/lib/blueprint/renderers/calcom-month-v1";
import { renderFormbricksStackV1 } from "@/lib/blueprint/renderers/formbricks-stack-v1";
import { renderGeneralServiceV1 } from "@/lib/blueprint/renderers/general-service-v1";
import { buildBlueprintForWorkspace, renderBlueprint } from "@/lib/blueprint/persist";
import { pickTemplate } from "@/lib/blueprint/templates";

test("pickTemplate — returns hvac for industry='hvac'", () => {
  const blueprint = pickTemplate("hvac");
  assert.equal(blueprint.workspace.industry, "hvac");
});

test("pickTemplate — falls back to general for unknown industry", () => {
  const blueprint = pickTemplate("not-a-real-industry");
  assert.equal(blueprint.workspace.industry, "general");
});

test("pickTemplate — returns deep clone (mutating result doesn't affect future calls)", () => {
  const a = pickTemplate("hvac");
  a.workspace.name = "MUTATED";
  const b = pickTemplate("hvac");
  assert.notEqual(b.workspace.name, "MUTATED", "second call should return fresh clone");
});

test("renderGeneralServiceV1 — produces non-empty html + css for HVAC blueprint", () => {
  const blueprint = pickTemplate("hvac");
  blueprint.workspace.name = "Lone Star Comfort HVAC";
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.html.length > 0, "html must be non-empty");
  assert.ok(out.css.length > 0, "css must be non-empty");
});

test("renderGeneralServiceV1 — escapes workspace name (XSS safety)", () => {
  const blueprint = pickTemplate("general");
  blueprint.workspace.name = `<script>alert("xss")</script>`;
  const out = renderGeneralServiceV1(blueprint);
  // C3.1 legitimately appends a self-contained IntersectionObserver <script>
  // for scroll animations, so we assert specifically against the malicious
  // payload rather than any <script> tag.
  assert.ok(
    !out.html.includes(`<script>alert`),
    "raw <script>alert payload must not appear in output"
  );
  assert.ok(!out.html.includes(`alert("xss")`), "alert call must not appear unescaped");
  assert.ok(out.html.includes("&lt;script&gt;"), "escaped form should appear");
});

test("renderGeneralServiceV1 — embeds the workspace name in the footer", () => {
  const blueprint = pickTemplate("hvac");
  blueprint.workspace.name = "Acme Heating Test 12345";
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.html.includes("Acme Heating Test 12345"), "name should appear in footer brand");
});

test("renderGeneralServiceV1 — emits the theme-token :root block as part of css", () => {
  const blueprint = pickTemplate("hvac");
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.css.includes("--sf-accent: "), "css should include theme tokens");
  assert.ok(out.css.includes(".sf-landing"), "css should include base landing styles");
});

test("renderGeneralServiceV1 — landing background is warm off-white #FAFAF7 for HVAC", () => {
  const blueprint = pickTemplate("hvac");
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.css.includes("--sf-bg-primary: #FAFAF7;"), "landing surface should use warm off-white");
});

test("renderGeneralServiceV1 — HVAC fallback does NOT include emergency-strip", () => {
  const blueprint = pickTemplate("hvac");
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(!out.html.includes("sf-emergency"), "HVAC fallback skips the emergency strip");
});

test("renderGeneralServiceV1 — general blueprint does NOT include emergency-strip", () => {
  const blueprint = pickTemplate("general");
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(!out.html.includes("sf-emergency"), "general template skips the emergency strip");
});

test("renderGeneralServiceV1 — output is byte-stable for the same blueprint (deterministic)", () => {
  const a = renderGeneralServiceV1(pickTemplate("hvac"));
  const b = renderGeneralServiceV1(pickTemplate("hvac"));
  assert.equal(a.html, b.html, "html must be byte-stable across calls");
  assert.equal(a.css, b.css, "css must be byte-stable across calls");
});

test("renderGeneralServiceV1 — services-grid renders all items from blueprint", () => {
  const blueprint = pickTemplate("hvac");
  // hvac.json's fallback services grid keeps the core 5 HVAC categories.
  // C3.1 cards carry multiple classes
  // (`sf-service sf-animate sf-delay-N`) so we count by the unique title slot
  // instead of the whole-attribute equality match.
  const out = renderGeneralServiceV1(blueprint);
  const serviceCardCount = (out.html.match(/class="sf-service__title"/g) ?? []).length;
  assert.equal(serviceCardCount, 5, "HVAC fallback has 5 neutral service categories");
});

test("HVAC public fallback blueprint is fact-neutral and keeps booking/intake CTAs", () => {
  const blueprint = buildBlueprintForWorkspace("Lone Star Comfort HVAC", "hvac");
  const landing = renderBlueprint(blueprint);
  const booking = renderCalcomMonthV1(blueprint);
  const intake = renderFormbricksStackV1(blueprint);
  const publicSurface = [
    JSON.stringify(blueprint),
    landing.contentHtml,
    landing.contentCss,
    booking.html,
    booking.css,
    intake.html,
    intake.css,
  ].join("\n");

  const unsafeMarkers = [
    "24/7 Emergency Service",
    "A cool home in 24 hours",
    "Same-day",
    "1,200",
    "Google reviews",
    "20 years",
    "Trane",
    "Lennox",
    "Goodman",
    "Mitsubishi",
    "0% financing",
    "$2M",
    "(555) 555-0100",
    "one business hour",
    "free estimate",
    "diagnostic fee",
  ];

  for (const marker of unsafeMarkers) {
    assert.ok(
      !publicSurface.toLowerCase().includes(marker.toLowerCase()),
      `HVAC fallback must not contain unsafe marker: ${marker}`,
    );
  }

  assert.match(publicSurface, /HVAC service for your home/i);
  assert.match(publicSurface, /AC repair/i);
  assert.match(publicSurface, /Heating repair/i);
  assert.match(publicSurface, /HVAC installation/i);
  assert.match(publicSurface, /href="\/book"/);
  assert.match(publicSurface, /href="\/intake"/);
});

test("renderGeneralServiceV1 — testimonials have a featured quote + grid items", () => {
  // C3.1 hides testimonials that still contain `[Customer Name]` /
  // `[Neighborhood]` placeholders. Templates ship with placeholders so the
  // shipped output for raw HVAC is intentionally empty until the operator
  // fills in real testimonials. To verify the renderer can produce both
  // featured + grid, we resolve the placeholders inline.
  const blueprint = pickTemplate("hvac");
  if (blueprint.landing.sections) {
    for (const section of blueprint.landing.sections) {
      if (section.type === "testimonials") {
        section.headline = "What our customers say";
        if (section.featured) {
          section.featured.authorName = "Sarah Linton";
          section.featured.authorRole = "Homeowner in Bedford";
        }
        section.items.forEach((item, i) => {
          item.authorName = `Real Customer ${i + 1}`;
          item.authorRole = "Homeowner";
        });
      }
    }
  }
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.html.includes("sf-testimonials__featured"), "featured quote present");
  assert.ok(out.html.includes("sf-testimonials__grid"), "grid present");
});

test("renderGeneralServiceV1 — FAQ uses <details>/<summary> for accordion", () => {
  const blueprint = pickTemplate("hvac");
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.html.includes("<details class=\"sf-faq__item\">"), "FAQ uses native accordion");
});

test("renderGeneralServiceV1 — footer powered-by SeldonFrame is present", () => {
  const blueprint = pickTemplate("general");
  const out = renderGeneralServiceV1(blueprint);
  assert.ok(out.html.includes("Powered by"), "powered-by present");
  assert.ok(out.html.includes("seldonframe.com"), "links to seldonframe.com");
});
