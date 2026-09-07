const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
const token = (process.env.TWILIO_AUTH_TOKEN || "").trim();
const apiKey = (process.env.TWILIO_API_KEY || "").trim();
const apiSecret = (process.env.TWILIO_API_SECRET || "").trim();
const from =
  (process.env.TWILIO_PHONE_NUMBER ||
   process.env.TWILIO_FROM_NUMBER ||
   process.env.TWILIO_FROM ||
   "").trim();

console.log(JSON.stringify({
  accountSidConfigured: Boolean(sid),
  authTokenConfigured: Boolean(token),
  apiKeyConfigured: Boolean(apiKey),
  apiSecretConfigured: Boolean(apiSecret),
  fromNumberConfigured: Boolean(from),
  fromNumber: from || null
}, null, 2));
