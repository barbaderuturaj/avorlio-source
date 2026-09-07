import { resendProvider } from "./packages/crm/src/lib/emails/providers/resend.ts";

const orgId = "e50aee42-f3e5-41c7-99fa-5e7db508651d";

const result = await resendProvider.send({
  orgId,
  from: "onboarding@resend.dev",
  to: "barbaderuturaj@gmail.com",
  subject: "SeldonFrame Resend QA Test",
  html: "<p>This is a controlled Resend transport test from SeldonFrame.</p>",
  text: "This is a controlled Resend transport test from SeldonFrame.",
});

console.log(JSON.stringify(result, null, 2));
