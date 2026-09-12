import assert from "node:assert/strict";
import test from "node:test";
import { validatePublicIntakeAnswers } from "@/lib/forms/validation";

const phoneField = [{ key: "phone", label: "Phone", type: "phone", required: true }];

test("public intake phone validation accepts international numbers", () => {
  assert.equal(validatePublicIntakeAnswers(phoneField, { phone: "+91 98765 43210" }), null);
});

test("public intake phone validation rejects repeated-digit junk", () => {
  assert.match(
    validatePublicIntakeAnswers(phoneField, { phone: "55555555" }) ?? "",
    /valid phone/i,
  );
});
