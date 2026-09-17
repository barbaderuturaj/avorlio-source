# Avorlio staged growth roadmap

> **THIS IS A DIRECTIONAL ROADMAP, NOT A PROMISE OR AUTOMATIC FEATURE QUEUE.**
>
> Future AI agents must not implement a later stage merely because it is listed
> here. Progress to the next stage only when the preceding stage is working in
> real customer use or the operator explicitly changes direction.

## Stage 0 — Current V1 / launch baseline

Avorlio is a done-for-you AI Front Office for US residential HVAC businesses.
The founder-led offer for the first few customers is **$299 USD/month**, with
no setup fee and no free trial. Customers keep their existing website; Avorlio
is installed and managed around the existing business workflow.

The current V1 is a source-supported, operator-managed flow that includes:

- customer onboarding and an internal readiness process;
- workspace and operator/CRM visibility;
- public website and customer-facing surfaces where configured;
- a website chatbot / AI front office with approved business Q&A;
- lead and job-detail collection, followed by booking workflows;
- Google Calendar workflow/integration when it is configured per customer;
- email confirmations when the provider is configured per customer; and
- Dodo recurring subscription and entitlement handling for the HVAC offer.

The V1 objective is not to become a huge all-in-one platform. It is:

**SELL → ONBOARD → INSTALL → HANDLE LEADS → BOOK → OPERATE RELIABLY → GET REAL CUSTOMER PROOF.**

## Stage 1 — First 1–3 paying HVAC customers

This is the immediate business stage. The priority order is:

1. Customer acquisition.
2. Respond to interested prospects.
3. Close the first paid customer.
4. Manually onboard that customer.
5. Connect the required calendar, email, and billing pieces.
6. Install Avorlio on the customer's existing site.
7. Verify the real lead, chat, and booking journey.
8. Support the customer closely.
9. Fix only genuine customer blockers.
10. Obtain real proof, testimonials, or case-study evidence where appropriate.
11. Repeat for customer #2 and #3.

Do not begin broad feature work because dormant SeldonFrame code exists. Fix
production blockers, customer blockers, reliability issues, and onboarding
friction repeatedly experienced by real customers. Defer speculative features,
unnecessary platform abstractions, unrelated verticals, marketplace expansion,
and premature scale engineering.

## Stage 2 — Make the HVAC offer repeatable

**Trigger:** several real HVAC customers use roughly the same workflow and
repeated manual steps are identifiable.

Turn founder knowledge into a repeatable delivery system only where repetition
justifies it. Potential work includes onboarding automation, HVAC
configuration/templates, easier installation/embed flow, business-hours,
services, FAQ, booking-policy, calendar, and email setup, a clearer operator
readiness checklist, better support diagnostics, customer-safe configuration,
and fewer manual founder steps.

Preserve the done-for-you outcome. Automation should reduce delivery time, not
prematurely force customers into a self-service SaaS model.

## Stage 3 — Strengthen the core product

**Trigger:** HVAC onboarding and real usage reveal recurring product needs.

Evidence-driven priorities may include chatbot/front-office reliability and
latency, booking reliability, lead capture and qualification, operator
notifications, CRM usability, calendar synchronization, email delivery and
confirmations, production monitoring, billing/entitlement hardening, easier
deployment/upgrade processes, release identity/rollback discipline, and
customer-facing reporting only when customers actually request and use it.

Do not invent dashboards or analytics for appearance. Prioritize customer
outcome over reliability, reliability over operator simplicity, and operator
simplicity over feature count.

## Stage 4 — Optional channel expansion

SMS and voice are intentionally deferred from initial launch. They may become
active only when the core web/booking flow is reliable, paying customers ask or
evidence shows value, cost/reliability/compliance implications are understood,
and the integration is production-tested.

Potential future channels include SMS, voice, and additional inbound/outbound
communication. Existing inherited Twilio, OpenAI Realtime, or related code does
not mean these channels are launched.

## Stage 5 — Business scale / less founder manual work

**Trigger:** enough customers exist that repeated manual operation consumes
meaningful time.

Potential work includes repeatable customer provisioning, safer automated
deployment, configuration workflows, support diagnostics, onboarding
automation, billing/entitlement operations, internal customer-health
visibility, standard playbooks, and controlled operational automation. Do not
optimize for hundreds of customers while serving only a handful; scale the
actual bottleneck.

## Stage 6 — Pricing / offer evolution

The $299/month, no-setup-fee founding offer is an early-customer offer. Pricing
may evolve after evidence and customer proof, potentially toward a higher price
such as approximately $499/month or another evidence-supported package. This
is not an automatic pricing change.

Future pricing depends on demonstrated customer value, delivery and support
cost, reliability, demand, included channels/features, and customer segment.
Do not hard-code future pricing assumptions into application logic without
explicit approval.

## Stage 7 — Other verticals only after HVAC works

Historical SeldonFrame code contains plumbing, med-spa, and other concepts;
none are current Avorlio launch scope. Expand beyond HVAC only after acquisition
works, onboarding is repeatable, reliability is proven, unit economics and
support burden are understood, and the operator explicitly decides to expand.

When expansion is approved, prefer stable-core reuse with vertical
configuration/templates over copying divergent products. Do not begin
cross-vertical work proactively.

## Stage 8 — Platform / marketplace / self-service options

The inherited repository contains broader platform, MCP, marketplace,
agent-building, and agency ideas. Treat them as optional long-term assets, not
the current roadmap. Revisit them only when real customer and business demand
justifies becoming more platform-like.

Possible long-term directions include self-service configuration,
agency/multi-client tooling, reusable vertical packs, broader agent workflows,
marketplace/ecosystem features, and APIs/integrations. None are commitments.

## Permanent prioritization rule

When deciding what Avorlio should work on next:

1. Active paying-customer emergency/blocker
2. Interested buyer / sales blocker
3. Reliability of current HVAC V1
4. Repeated onboarding/delivery friction
5. Repeated request from multiple real customers
6. Operational automation that saves measurable recurring effort
7. Core product improvement supported by usage evidence
8. Optional new channel
9. New vertical
10. Platform/marketplace/speculative feature

A lower-number item normally outranks a higher-number item.

## What we do not do

- Do not reopen broad QA endlessly.
- Do not chase perfection before sales.
- Do not activate every inherited SeldonFrame feature.
- Do not expand verticals merely because code exists.
- Do not build speculative features without customer evidence.
- Do not make SMS or voice launch blockers.
- Do not replace stable production components without reason.
- Do not introduce infrastructure complexity before it is needed.
- Do not confuse “possible in repo” with “part of current Avorlio offer.”
- Do not let a future AI independently change business direction.

## Roadmap decision gates

Movement between stages requires at least one of:

- explicit operator decision;
- evidence from paying customers;
- repeated operational pain; or
- measurable reliability/scaling requirement.

An AI agent must not promote the project to another roadmap stage based only on
its own preference.

## Relationship to the Project Brain

- `01-PRODUCT.md` — what the product currently is.
- `10-HVAC-CUSTOMER-FLOW.md` — the current customer lifecycle.
- `12-KNOWN-LIMITS.md` — what is limited or deferred.
- `13-DECISIONS.md` — major decisions already made.
- `16-CURRENT-STATE.md` — the current verified technical snapshot.
- `18-GROWTH-ROADMAP.md` — the intended direction and order of growth.
