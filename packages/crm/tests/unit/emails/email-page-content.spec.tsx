import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import React from "react";

import { EmailPageContent } from "@/components/emails/email-page-content";
import { OutboundTriggersSection } from "@/components/messaging/outbound-triggers-section";

const integrations = {
  resend: { connected: false, maskedKey: "", fromEmail: "", fromName: "" },
  twilio: { connected: false, accountSid: "", fromNumber: "", authTokenHint: "" },
  newsletter: {
    kit: { connected: false, maskedKey: "" },
    mailchimp: { connected: false, maskedKey: "" },
    beehiiv: { connected: false, maskedKey: "" },
  },
};

function renderEmailPage(deliveries: React.ComponentProps<typeof EmailPageContent>["deliveries"]) {
  return renderToString(
    <EmailPageContent
      templates={[]}
      deliveries={deliveries}
      createTemplateAction={async () => {}}
      emailIntegrations={integrations}
      saveIntegrationAction={async () => {}}
      disconnectIntegrationAction={async () => {}}
    />,
  );
}

describe("EmailPageContent delivery truthfulness", () => {
  test("renders truthful delivery summary copy instead of sent-only copy", () => {
    const html = renderEmailPage([
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `queued-${index}`,
        channel: "email" as const,
        toAddress: `lead${index}@example.com`,
        subject: "Booking confirmation",
        status: "queued",
        provider: "resend",
        sentAt: null,
        createdAt: "2026-08-25T00:00:00.000Z",
        error: null,
        eventType: null,
        source: "email-record" as const,
      })),
      {
        id: "failed-email",
        channel: "email" as const,
        toAddress: "lead@example.com",
        subject: "Booking confirmation",
        status: "failed",
        provider: "outbound trigger",
        sentAt: null,
        createdAt: "2026-08-25T00:00:00.000Z",
        error: "Resend send failed with 400",
        eventType: "booking.created",
        source: "outbound-send" as const,
      },
    ]);

    assert.match(html, /Delivery log \(7\)/);
    assert.match(html, /0 sent · 6 queued · 1 failed/);
    assert.doesNotMatch(html, /7 emails sent so far/i);
    assert.doesNotMatch(html, /6 emails sent so far/i);
  });

  test("failed outbound attempts are visible in the delivery log data", () => {
    const html = renderEmailPage([
      {
        id: "failed-sms",
        channel: "sms",
        toAddress: "+12145550199",
        subject: null,
        status: "failed",
        provider: "outbound trigger",
        sentAt: null,
        createdAt: "2026-08-25T00:00:00.000Z",
        error: "Twilio send failed",
        eventType: "booking.created",
        source: "outbound-send",
      },
    ]);

    assert.match(html, /Delivery log \(1\)/);
    assert.match(html, /0 sent · 1 failed/);
    assert.match(html, /failed attempts need attention/);
  });
});

describe("OutboundTriggersSection", () => {
  test("existing trigger list still renders enabled trigger state", () => {
    const html = renderToString(
      <OutboundTriggersSection
        triggers={[
          {
            id: "trigger-1",
            eventType: "booking.created",
            channel: "email",
            skillId: "booking-confirmation",
            skillLabel: "Booking confirmation",
            enabled: true,
            delayMinutes: 0,
            hasCustomSkillMd: false,
            customSkillMd: "",
            platformDefaultMd: "Send a confirmation.",
            notes: null,
            createdAt: "2026-08-25T00:00:00.000Z",
            updatedAt: "2026-08-25T00:00:00.000Z",
          },
        ]}
      />,
    );

    assert.match(html, /Transactional triggers/);
    assert.match(html, /Booking confirmation/);
    assert.match(html, /booking.created/);
    assert.match(html, /Enabled/);
  });
});
