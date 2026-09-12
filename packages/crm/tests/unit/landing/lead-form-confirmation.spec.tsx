import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { leadFormConfirmation } from "@/components/landing-r1/sections/lead-form";

describe("leadFormConfirmation", () => {
  test("SMS sent with booking → uses professional confirmation and available-times language", () => {
    const c = leadFormConfirmation({
      name: "Dana Reyes",
      smsSent: true,
      bookUrl: "https://x.app.seldonframe.com/book",
    });
    assert.equal(c.headline, "Thanks, Dana. We received your request.");
    assert.match(c.body, /available times/i);
    // No book button when we already texted the link.
    assert.equal(c.showBookButton, false);
  });

  test("no SMS with booking → offers available times without implying a booking", () => {
    const c = leadFormConfirmation({
      name: "Dana Reyes",
      smsSent: false,
      bookUrl: "https://x.app.seldonframe.com/book",
    });
    assert.equal(c.headline, "Thanks, Dana. We received your request.");
    assert.doesNotMatch(c.headline, /Got it/);
    assert.equal(c.showBookButton, true);
    assert.equal(c.bookUrl, "https://x.app.seldonframe.com/book");
  });

  test("booking unavailable → keeps confirmation but hides booking CTA", () => {
    const c = leadFormConfirmation({ name: "Dana Reyes", smsSent: false, bookUrl: "" });
    assert.equal(c.headline, "Thanks, Dana. We received your request.");
    assert.equal(c.showBookButton, false);
    assert.equal(c.bookUrl, "");
  });

  test("empty name uses the generic professional confirmation", () => {
    const c = leadFormConfirmation({ name: "", smsSent: true, bookUrl: "" });
    assert.equal(c.headline, "Thanks! We received your request.");
    assert.doesNotMatch(c.headline, /Got it|undefined/);
  });
});
