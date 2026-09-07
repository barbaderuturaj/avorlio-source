const k = (process.env.RESEND_API_KEY || process.env.AUTH_RESEND_KEY || "").trim();
const f = (
  process.env.RESEND_FROM_ADDRESS ||
  process.env.AUTH_RESEND_FROM ||
  process.env.DEFAULT_FROM_EMAIL ||
  ""
).trim();

console.log(JSON.stringify({
  resendKeyConfigured: Boolean(k),
  fromAddressConfigured: Boolean(f),
  fromAddress: f || null
}, null, 2));
