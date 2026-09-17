# HVAC customer flow

This is the launch-oriented flow; it separates manual operator work from
source-supported automation.

1. **Sale and payment — manual then automated.** Early customers are manually
   sold. An authorized operator/manager creates a Dodo hosted checkout for the
   selected workspace.
2. **Subscription activation — automated.** A signature-verified
   `subscription.active` webhook matching the HVAC offer stores active Dodo
   state, seeds the onboarding form, and creates/reuses a pending onboarding link.
3. **Customer onboarding — automated surface, operator oversight.** The customer
   completes the tokenized onboarding form. Code under `src/lib/onboarding/`
   parses business facts/services/hours and produces/applies a change plan.
4. **Internal readiness — manual verification.** The operator verifies the
   resulting Soul, branding, services, booking rules, public URLs, and any
   customer-provided facts before go-live.
5. **Website/chat/booking — source-supported.** Public workspace routing serves
   the generated site. The web agent uses the configured prompt/tools/validators;
   booking creates workspace-scoped CRM/booking state and may synchronize with
   Google Calendar if connected.
6. **Calendar/email — optional configuration.** Calendar and transactional email
   code can operate when providers are configured; verify this per customer.
7. **Operator visibility and go-live — manual responsibility.** Dashboard/CRM
   surfaces provide workspace visibility, but a human confirms public routes,
   booking behavior, and provider configuration before representing a customer
   as live.

Do not promise SMS or voice in the initial flow solely because related code
exists. Do not turn code presence into a claim of production configuration.

