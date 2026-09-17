# Integrations

| Integration | State | Relevant code |
| --- | --- | --- |
| Dodo Payments | Active launch billing path | `src/lib/billing/dodo-*`, `src/app/api/webhooks/dodo/route.ts` |
| Anthropic / LiteLLM | Active AI runtime routing when configured | `src/lib/ai/`, `src/lib/agents/runtime.ts`, compose `litellm` service |
| Google Calendar | Optional, code-supported booking/calendar integration | `src/lib/bookings/google-calendar-sync.ts`, `src/lib/integrations/calendar-push.ts`, deployment calendar code |
| Resend email | Optional, code-supported transactional/onboarding email | `src/lib/emails/`, `src/lib/onboarding/welcome-email.ts`, webhook route |
| Twilio SMS/voice | Deferred for initial Avorlio launch unless explicitly enabled | `src/lib/sms/`, `src/lib/telephony/`, webhook routes |
| Stripe / marketplace | Historical/inherited code, not the Avorlio launch billing source of truth | `src/app/api/stripe/`, `src/app/api/webhooks/stripe*`, marketplace billing |
| Composio | Optional/inherited connector support | `src/lib/integrations/composio/` |

An integration being present in code does not establish production configuration.
Do not enable a provider, change its webhooks, or expose credentials without
explicit instruction and a focused verification plan.

