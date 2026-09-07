# Client-Onboarding Intake + Wiring Agent — Design

**Date:** 2026-06-04
**Status:** Approved design (mode: review-then-apply)
**Author:** Max + Claude

## Goal

When an agency's client pays, send them a world-class, no-login multi-step
intake form. When they submit, a **wiring agent** maps their answers and
uploaded files into a **staged change-plan** across the new workspace
(Soul → website → booking → chatbot → CRM). The agency reviews the plan and
clicks **"Apply all."** One link turns "client paid" into a fully built
front office, with a human QA gate before anything goes live.

## Why review-then-apply (not fully automatic)

The agency sells a paid setup ($1,500). They want to eyeball the client's
site, booking, and imported data before the client sees it — and the review
screen doubles as the "look what we built you" moment on the kickoff call.
A fully-automatic mode can be added later as a per-agency toggle.

## Background — what already exists (reuse, don't rebuild)

- **Proposal → Stripe Connect payment → workspace activation** is built. The
  post-payment hook is the Connect webhook
  `app/api/webhooks/stripe/connect/route.ts` (`checkout.session.completed`,
  ~line 535) — the clean insertion point for "generate + email the onboarding
  link."
- **Intake-form engine is in-house** (modeled after Formbricks, not embedded).
  It already renders a **Typeform-style one-question-per-card** flow with a
  progress bar, Back/Continue, auto-advance, `showIf` conditional logic, and
  validation — `lib/blueprint/renderers/formbricks-stack-v1.ts`. The card UX is
  free; we just author questions.
- **Field types supported by the renderer:** `text, textarea, email, phone,
  number, select, multi-select, rating, date`. **No `file` type** (the one gap).
- **Submission fires events:** the public intake POST
  (`app/api/v1/public/intake/route.ts`) emits `intake.submitted` and
  `form.submitted` on the Seldon event bus; `lib/events/listeners.ts` already
  fans `form.submitted` out to deployed agents (matcher on `$formId`). The
  wiring agent subscribes here — **zero new event plumbing.**
- **Tokenized public links** are an established pattern: `proposals.signedToken`
  + `lib/proposals/load-by-token.ts` + the `/p/[token]` public route family.
  We mirror it with `/onboard/[token]` (no client login).
- **Soul is the source of truth** (`organizations.soul` JSONB, written in BOTH
  camelCase and snake_case by `buildSeedSoul`). `submit_soul` cascades:
  `applyPipelineStagesFromSoul` + `seedLandingFromSoul`.
- **Every per-surface apply function already exists** (see "Apply surface").

## Non-goals (YAGNI)

- Fully-automatic apply (chosen: review-then-apply).
- Bookings-CSV import execution — store the uploaded file and flag it
  "import on request"; the importer is a separate sub-project. Contacts import
  already works and IS in scope.
- Real Google Meet/Zoom link generation (separate booking-location sub-project).
- Auto Twilio number provisioning (agency does Twilio manually for now — the
  agent only *generates the instructions*).
- New "repeatable group" or "hours-grid" field types — avoided by capturing
  hours and services as guided free-text that the agent parses (see below).

## Architecture — the lifecycle

```
Client pays
  └─ Stripe Connect webhook (checkout.session.completed, ~line 535)
       ├─ generate signed onboarding token → /onboard/[token]
       └─ email the link to the new client (agency-branded)

Client opens /onboard/[token] (no login)
  └─ fills the 7-chapter card flow (existing renderer)
       └─ submit → blob-upload any files → store answers
            └─ fires form.submitted (existing event bus)

Wiring agent (subscribed to the onboarding formId)
  └─ reads answers + file URLs
       └─ builds a CHANGE PLAN (structured diff), status = pending_review
            └─ notifies the agency

Agency opens the review screen
  └─ sees the plan → clicks "Apply all"
       └─ executor runs server actions in order
            └─ workspace marked ready → agency + client notified
```

## Components to build

### 1. `file` question type (the one form gap)

- Add `file` to `IntakeQuestion` (`lib/blueprint/types.ts`) with config
  `{ accept: string[], maxSizeMb: number, multiple: boolean }`.
- Add the input branch to the renderer's `renderQuestionInput` switch
  (`formbricks-stack-v1.ts`).
- On submit, upload each file to Vercel Blob (reuse `lib/uploads/user-image.ts`
  + `@vercel/blob` `put`), and store the resulting URL(s) in the submission
  `data` under the question key. The public intake POST stores only JSON today,
  so add the upload step ahead of the JSON write.
- Validation: enforce `accept` (images for logo/photos; `.csv/.xlsx` for data)
  and `maxSizeMb`.

### 2. The onboarding form definition

- A canonical onboarding intake (the 7 chapters below), seeded as a copy per
  activated workspace so branding/`showIf` can vary, with a stable slug
  `onboarding` (and the formId recorded on the workspace so the agent can gate).

### 3. Delivery — tokenized link + email

- New table `onboarding_links { token (unique, indexed), orgId, status
  (pending|submitted|applied), createdAt, submittedAt }`. Token shape mirrors
  `proposals.signedToken` (`^[A-Za-z0-9_-]{32,}$`).
- In the Connect webhook post-activation block: create the row, build the URL,
  send an agency-branded email to the client.
- Public route `app/onboard/[token]/page.tsx` — validate token (reuse the
  `load-by-token` regex-then-DB pattern), render the workspace's onboarding form.
  No auth.

### 4. The wiring agent

- A listener gated on the onboarding `formId` (reuse the existing
  `form.submitted` fan-out, or a dedicated listener in `lib/events/listeners.ts`).
- Reads answers + file URLs and produces a **change plan**: an ordered,
  structured list of operations with human-readable summaries. LLM parsing turns
  guided free-text into structure (hours-text → weekly availability;
  services-text → appointment types; brand description → theme).
- Persist: new table `change_plans { id, orgId, submissionId, plan jsonb,
  status (pending_review|applied|discarded), createdAt, appliedAt }`.
- **Review UI** (dashboard): renders the plan grouped by surface with the
  before/after summary; a single **"Apply all"** button (and per-item skip).
- **Executor** (on Apply) runs, in order:
  1. **Soul:** write `organizations.soul` (both casings) + `applyPipelineStagesFromSoul` + `seedLandingFromSoul(orgId)` → re-renders `/w/[slug]`.
  2. **Booking:** `updateBookingTypeAction` for hours/price/duration on the
     default type; create extra appointment types from parsed services.
  3. **Theme:** `update_theme` (mode/colors/font) from logo/brand answers.
  4. **Chatbot:** `update_website_chatbot` to refresh FAQ/pricing/greeting from
     the new Soul (Soul edits do NOT auto-update an existing chatbot).
  5. **Contacts:** parse the uploaded CSV/XLSX → `bulkImportContactsAction({ rows })`.
  6. **Domain / voice / SMS:** generate instructions only (DNS records from the
     existing apex-A/CNAME logic; Twilio forwarding steps keyed to the client's
     `call_handling` choice). Surfaced to the agency/client — not auto-applied.
- Mark workspace ready; notify agency + client.

## The intake — 7 chapters (few questions per card, plain copy)

`*` = required. `file*` types are the new field. Hours/services are free-text
parsed by the agent (no new field types).

**0 — Welcome** (intro panel) — "Let's build your new front office. ~10 minutes.
Upload what you have; skip what you don't and we'll handle it."

**1 — Your business**
- `business_name` text* (prefilled from the proposal)
- `tagline` text* — "What you do, in one line"
- `phone` phone* · `email` email*
- `has_public_address` select* (Yes / No)
- `address` text — showIf `has_public_address = Yes`
- `hours_text` textarea* — "Your weekly hours (e.g. Mon–Fri 9–5, Sat 10–2,
  closed Sun)" → agent parses to `availability`

**2 — Services & prices**
- `services_text` textarea* — "List your services with prices, one per line
  (e.g. 60-min massage — $90)" → agent parses to appointment types
- `primary_service` text* — "Which one is your big 'Book now' button?"

**3 — Brand & photos**
- `logo` file (image, optional)
- `brand_colors` text — "Brand colors (or leave blank to use your logo's)"
- `photos` file (image, multiple, optional) — else stock for the vertical
- `website_url` text (optional) · `socials` textarea (optional)

**4 — Get found & reviewed**
- `google_reviews_url` text (optional) — "Your Google Business / reviews link"
- `testimonials` textarea (optional) — "A few things clients always say (or
  leave blank — we'll pull from Google)"

**5 — Move your data** (optional)
- `contacts_file` file (.csv/.xlsx, optional)
- `bookings_file` file (.csv, optional) — stored, imported on request

**6 — Phones & follow-up**
- `call_handling` select* — (AI answers / I answer, AI texts missed calls / Not yet)
- `lead_routing` multi-select* — (Email / Text)

**7 — Your website domain**
- `has_domain` select* (Yes / No)
- `domain` text — showIf `has_domain = Yes`

**Done** (closing panel) — "That's everything. We're building your front office
now — you'll get an email the moment it's ready to review."

## Answer → apply mapping

| Answer(s) | Applied via |
| --- | --- |
| business_name, tagline, phone, email, address, "what you do" | Soul (both casings) → `seedLandingFromSoul()` |
| hours_text (parsed) | `updateBookingTypeAction` (`availability`) — only path that sets hours |
| services_text (parsed), primary_service | create appointment types (`updateBookingTypeAction`/create) + Soul offerings → landing |
| logo, brand_colors | `update_theme` + store logo |
| photos, website_url, socials | Soul → landing payload (hero/gallery/footer) |
| google_reviews_url, testimonials | Soul (`google_place_url`, `testimonials`) → review automations + landing |
| contacts_file | parse → `bulkImportContactsAction({ rows })` |
| bookings_file | stored; flagged for import (sub-project) |
| call_handling | generates Twilio steps (Voice/Messaging config + forward-on-no-answer); applies missed-call-text-back archetype if chosen |
| lead_routing | notification settings |
| has_domain, domain | stores domain + generates DNS steps (apex A / CNAME) |
| (all of the above) | `update_website_chatbot` to refresh the chatbot persona |

## Key technical gotchas (designed for)

1. **Soul → landing is not automatic.** Plain soul writes don't re-render the
   page; the executor must call `seedLandingFromSoul(orgId)` (what `submit_soul`
   does internally).
2. **Chatbot persona is separate from Soul.** Updating Soul does not refresh an
   existing chatbot's FAQ/pricing/greeting — the executor calls
   `update_website_chatbot` explicitly.
3. **Booking hours can only be set via `updateBookingTypeAction`** (server
   action) — the MCP `create_appointment_type`/`update_appointment_type` tools
   cannot set `availability` (create hardcodes Mon–Fri 9–5; update ignores it).
4. **Dual Soul casing** — write both camelCase and snake_case to match
   `buildSeedSoul`, or landing/settings read mismatched data.
5. **Free-text parsing** is the agent's job — hours and services come in as
   prose; the agent produces the structured `availability` and appointment-type
   rows, and surfaces them in the review plan so the agency can correct.

## Data-model changes

- `IntakeQuestion`: add `file` type + `{ accept, maxSizeMb, multiple }`.
- `intake_submissions`: no schema change — file URLs live in `data` (jsonb).
- New table `onboarding_links` (token, orgId, status, timestamps).
- New table `change_plans` (id, orgId, submissionId, plan jsonb, status,
  createdAt, appliedAt).

## Testing strategy (TDD)

- **Unit (pure, test-first):** the answer→change-plan mapper (hours-text →
  availability; services-text → appointment types); `file` validation
  (accept/size). These are deterministic and the core risk.
- **Unit (mocked):** the executor calls the right server actions in the right
  order with the mapped inputs.
- **Integration:** submit onboarding form → `form.submitted` → a `change_plans`
  row appears as `pending_review`; "Apply all" → executor invokes each surface;
  status flips to `applied`.
- **Manual (Vercel preview):** pay (test mode) → receive link → fill the form
  with a logo + a contacts CSV → review screen shows the plan → Apply →
  workspace landing/booking/chatbot/contacts reflect the answers.

## Rollout

- Fires only for agency-activated workspaces (gated by the proposal/activation
  flow). Existing self-serve workspaces are unaffected.
- Bookings-CSV import ships stubbed (file stored, flagged). Everything else is
  fully applied.

## Decomposition note

This spec is one sub-project of a larger arc Max raised. Tracked separately:
**(B)** bookings-CSV importer, **(C)** booking date-blocking + real Meet/Zoom
location field, **(D)** turnkey live voice, **(E)** refresh the stale
`/docs/agents/voice-sms` article. None block this spec.
