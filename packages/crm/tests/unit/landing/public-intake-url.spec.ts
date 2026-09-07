import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicIntakeUrl } from "@/lib/bookings/public-booking-url";

test("public intake URL uses the app-host path for local/self-hosted requests", () => {
  assert.equal(
    buildPublicIntakeUrl({
      requestOrigin: "http://localhost:3002",
      orgSlug: "dallasflow-plumbing",
      formSlug: "intake",
    }),
    "http://localhost:3002/forms/dallasflow-plumbing/intake",
  );
});

test("public intake URL uses the workspace-host shortcut on hosted subdomains", () => {
  assert.equal(
    buildPublicIntakeUrl({
      requestOrigin: "https://dallasflow-plumbing.app.seldonframe.com",
      orgSlug: "dallasflow-plumbing",
      formSlug: "get-in-touch",
    }),
    "https://dallasflow-plumbing.app.seldonframe.com/forms/get-in-touch",
  );
});
