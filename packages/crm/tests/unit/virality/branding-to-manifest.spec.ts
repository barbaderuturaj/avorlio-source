// Pins the per-agency PWA manifest mapping. The dynamic
// /portal/[orgSlug]/manifest.webmanifest route is a thin shell over
// brandingToManifestOptions(...) + generatePwaManifest(...); these
// tests are the real coverage for "agency name/theme drives the
// installed app identity, Avorlio defaults otherwise".

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  brandingToManifestOptions,
  generatePwaManifest,
} from "@seldonframe/core/virality";

const LEGACY_DEFAULT_BRANDING = {
  is_white_label: false,
  brand_name: "SeldonFrame",
  logo_url: null,
  primary_color: null,
  accent_color: null,
};

const AGENCY_BRANDING = {
  is_white_label: true,
  brand_name: "Seldon Studio",
  logo_url: "https://cdn.example.com/logo.png",
  primary_color: "#5b21b6",
  accent_color: "#a78bfa",
};

describe("brandingToManifestOptions", () => {
  test("scopes start_url + scope to the org's portal path", () => {
    const opts = brandingToManifestOptions({ orgSlug: "rapid-rooter", workspaceName: "Rapid Rooter", branding: AGENCY_BRANDING });
    assert.equal(opts.startUrl, "/portal/rapid-rooter/");
    assert.equal(opts.scope, "/portal/rapid-rooter/");
  });

  test("uses the agency brand name for name + short_name", () => {
    const opts = brandingToManifestOptions({ orgSlug: "rapid-rooter", workspaceName: "Rapid Rooter", branding: AGENCY_BRANDING });
    assert.equal(opts.name, "Rapid Rooter — Seldon Studio");
    assert.equal(opts.shortName, "Rapid Rooter");
  });

  test("uses the agency primary color for theme_color", () => {
    const opts = brandingToManifestOptions({ orgSlug: "rapid-rooter", workspaceName: "Rapid Rooter", branding: AGENCY_BRANDING });
    assert.equal(opts.themeColor, "#5b21b6");
  });

  test("uses workspace name + Avorlio for the non-white-label default", () => {
    const opts = brandingToManifestOptions({ orgSlug: "demo", workspaceName: "Golden HVAC Test", branding: LEGACY_DEFAULT_BRANDING });
    assert.equal(opts.name, "Golden HVAC Test — Avorlio");
    assert.equal(opts.shortName, "Golden HVAC Test");
    assert.equal(opts.themeColor, "#0a0e14");
  });

  test("uses the existing Avorlio icon asset for the operator PWA", () => {
    const opts = brandingToManifestOptions({ orgSlug: "demo", workspaceName: "Demo", branding: LEGACY_DEFAULT_BRANDING });
    const srcs = (opts.icons ?? []).map((i) => i.src);
    assert.deepEqual(srcs, ["/brand/avorlio-favicon-v1.svg"]);
    assert.ok(!srcs.some((src) => /seldonframe|(^|\/)logo\.svg$/i.test(src)));
  });

  test("generatePwaManifest threads scope + standalone display through", () => {
    const manifest = generatePwaManifest(
      brandingToManifestOptions({ orgSlug: "rapid-rooter", workspaceName: "Rapid Rooter", branding: AGENCY_BRANDING }),
    );
    assert.equal(manifest.scope, "/portal/rapid-rooter/");
    assert.equal(manifest.start_url, "/portal/rapid-rooter/");
    assert.equal(manifest.display, "standalone");
  });

  test("normalizes only the historical SeldonFrame platform default", () => {
    const opts = brandingToManifestOptions({
      orgSlug: "golden-hvac-test",
      workspaceName: "Golden HVAC Test",
      branding: { ...AGENCY_BRANDING, brand_name: "seldonframe" },
    });
    assert.equal(opts.name, "Golden HVAC Test — Avorlio");
  });
});
