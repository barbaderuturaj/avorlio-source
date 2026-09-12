import assert from "node:assert/strict";
import test from "node:test";
import { resolveGeneratedSoulBookingPrice } from "@/lib/soul/generated-booking-price";

test("generated HVAC price is discarded without provenance", () => {
  assert.equal(
    resolveGeneratedSoulBookingPrice({
      businessName: "DesertCool HVAC",
      businessDescription: "Heating and cooling service company",
      price: 89,
    }),
    0,
  );
});

test("missing generated HVAC price resolves to zero", () => {
  assert.equal(
    resolveGeneratedSoulBookingPrice({
      businessName: "Pacific Coast Heating & Air",
      businessDescription: "HVAC service and repair",
      price: undefined,
    }),
    0,
  );
});

test("non-HVAC generated prices retain existing behavior", () => {
  assert.equal(
    resolveGeneratedSoulBookingPrice({
      businessName: "Dallas Plumbing",
      businessDescription: "Family-owned plumbing company",
      price: 149,
    }),
    149,
  );
});
