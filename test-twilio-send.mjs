import { twilioProvider } from "./src/lib/sms/providers/twilio.ts";

const orgId = "e50aee42-f3e5-41c7-99fa-5e7db508651d";
const from = "+17372508034";
const to = process.env.QA_SMS_TO || "";

if (!to) {
  throw new Error("QA_SMS_TO is missing");
}

console.log("Twilio configured:", await twilioProvider.isConfigured(orgId));

const result = await twilioProvider.send({
  orgId,
  from,
  to,
  body: "sms_appointment_reminders"
});

console.log(JSON.stringify(result, null, 2));
