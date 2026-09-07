# Telephony Voice-Number Provisioning (Phase 2.2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** When a builder activates a voice deployment, SeldonFrame **provisions a dedicated phone number** in the builder's own Twilio account and wires it to their Elastic SIP Trunk → OpenAI — so a deployed agent actually answers calls. No more manual number setup.

**Architecture:** `IncomingPhoneNumbers.create` (buy) → `Trunks/{TrunkSid}/PhoneNumbers` (attach) in the **builder's** Twilio account, resolved from `organizations.integrations.twilio` (BYO — reuses the existing `resolveTwilioAuth` pattern). Inbound call → builder's trunk → OpenAI Realtime SIP → the existing `resolveDeploymentByNumber` webhook. Idempotent provisioning state machine; number released on cancel.

**Spec:** `docs/superpowers/specs/2026-06-21-telephony-voice-provisioning-design.md` (architecture, the verified Twilio/OpenAI facts, MUST-VERIFY list). **Reconciliation:** the spec said "platform account + env vars"; this plan uses **BYO — the builder's connected Twilio** (matches the locked BYO-Twilio model and works for Seldon Studio today, which already has Twilio connected). The trunk is per-builder via a new `voiceTrunkSid` integration field.

**Tech stack:** Next.js 16, Drizzle + Neon, Twilio REST (Numbers + Trunking), `node:test`+`tsx`, the existing `lib/sms/providers/twilio.ts` auth pattern + `lib/encryption`.

**Conventions:** tests `( cd packages/crm && node --import tsx --test <file> )`; tsc `packages/crm/node_modules/.bin/tsc -p packages/crm/tsconfig.json --noEmit` (0 new src errors); pure logic in plain modules, `"use server"` only-async; DI the Twilio client so unit tests never hit the network; migration via drizzle + journal (loud-fail guard #95).

---

## ⚠️ Gates (surface to Max)
- **This deploy runs a migration** (`phone_number_sid` on `deployments`) — additive, safe, but not code-only.
- **Live test needs Max:** set `voiceTrunkSid` on Seldon Studio's Twilio integration (the 839 trunk SID), confirm Twilio connected, then provision a real number + call it. Unit tests use a mocked Twilio client; the live call is Max's verification.

---

## File structure
- **Migrate** `packages/crm/src/db/schema/deployments.ts` — add `phoneNumberSid` (text, nullable) + `numberOrigin` (`'provisioned'|'byo'`, nullable). Drizzle migration + journal.
- **Modify** `organizations.integrations.twilio` typing + add `lib/telephony/config.ts` — `resolveBuilderTelephony(orgId)` → `{ accountSid, authToken, voiceTrunkSid }` (reuses `resolveTwilioAuth`'s decrypt pattern).
- **Create** `lib/telephony/twilio-client.ts` — DI'd REST client: `searchLocalVoiceNumbers`, `buyNumber`, `attachNumberToTrunk`, `releaseNumber`.
- **Create** `lib/telephony/provision-voice-number.ts` — `provisionVoiceNumber(deps, {deploymentId, areaCode})` idempotent state machine.
- **Modify** `lib/deployments/actions.ts` — `provisionDeploymentNumberAction` (primary activate) + release-on-cancel; keep the BYO paste path.
- **Modify** the deploy/activate UI (`studio/agents/[id]/deploy/*` + `studio/clients/activate-form.tsx`) — "Get a number" (area-code → provision → active).
- **Modify** `lib/agents/voice/deployment-voice.ts` — persona isolation (client identity + `soul:null`).

---

## Phase 0 — schema + telephony config

### Task 1: schema — `phone_number_sid` + `number_origin` (migration)
- [ ] **Step 1:** Add to `deployments.ts`: `phoneNumberSid: text("phone_number_sid")`, `numberOrigin: text("number_origin")` (nullable). 
- [ ] **Step 2:** Generate the drizzle migration (`pnpm --filter crm db:generate` or the repo's generate command — confirm) + journal entry. Verify it's additive (ALTER TABLE ADD COLUMN only).
- [ ] **Step 3:** tsc clean. Commit `feat(telephony): deployments.phone_number_sid + number_origin`.

### Task 2: builder telephony config resolver (TDD)
**Files:** create `lib/telephony/config.ts`; extend the `twilio` integration type; test `tests/unit/telephony/config.spec.ts`.
- [ ] **Step 1:** Write a failing test for a pure `pickTelephonyFromIntegrations(blob)` → `{accountSid, authToken(raw), voiceTrunkSid}` (decrypt handled by the DB wrapper, like `byok-resolver`): returns the trunk sid + creds when present; nulls when absent.
- [ ] **Step 2:** Implement `pickTelephonyFromIntegrations` (pure) + `resolveBuilderTelephony(orgId)` (DB wrapper, decrypts authToken via the `v1.`-prefix pattern from `resolveTwilioAuth`). Add `voiceTrunkSid?: string` to the twilio integration type.
- [ ] **Step 3:** Green; tsc; commit `feat(telephony): resolveBuilderTelephony (BYO creds + voiceTrunkSid)`.

---

## Phase 1 — provisioning service

### Task 3: Twilio telephony REST client (DI interface)
**Files:** create `lib/telephony/twilio-client.ts`.
- [ ] **Step 1:** Define `TwilioTelephonyClient` interface: `searchLocalVoiceNumbers({areaCode,limit})`, `buyNumber({phoneNumber,friendlyName})→{sid,phoneNumber}`, `attachNumberToTrunk({trunkSid,phoneNumberSid})`, `releaseNumber({phoneNumberSid})`. Plus `createTwilioTelephonyClient({accountSid,authToken})` building the real one (Basic-auth REST, mirroring `lib/sms/providers/twilio.ts` fetch shape): Numbers API `https://api.twilio.com/2010-04-01/Accounts/{acct}/AvailablePhoneNumbers/US/Local.json` + `/IncomingPhoneNumbers.json`, Trunking API `https://trunking.twilio.com/v1/Trunks/{trunkSid}/PhoneNumbers`.
- [ ] **Step 2:** No live calls in tests — the interface is what `provisionVoiceNumber` consumes (fake in tests). tsc clean. Commit `feat(telephony): Twilio numbers+trunking REST client`.

### Task 4: `provisionVoiceNumber` state machine (TDD)
**Files:** create `lib/telephony/provision-voice-number.ts`; test `provision-voice-number.spec.ts`.
- [ ] **Step 1:** Write failing tests with a fake client + fake deployment store: NONE → search→buy→persist sid→attach→active; PURCHASED (has sid, not active) → resumes at attach (no re-buy); ALREADY_DONE (active+sid) → no-op; search-empty → `no_numbers_available`; attach-fail → leaves PURCHASED + `attach_failed`.
- [ ] **Step 2:** Implement the state machine (derive state from the deployment row; persist `phoneNumberSid`+`phoneNumber`+`numberOrigin:'provisioned'` immediately after buy — the durability point; flip `status:'active'` after attach). Typed errors (`no_numbers_available`/`provisioning_unavailable`/`attach_failed`).
- [ ] **Step 3:** Green; tsc; commit `feat(telephony): idempotent provisionVoiceNumber state machine`.

---

## Phase 2 — actions + UI

### Task 5: `provisionDeploymentNumberAction` + release-on-cancel
**Files:** modify `lib/deployments/actions.ts`.
- [ ] **Step 1:** `provisionDeploymentNumberAction({deploymentId, areaCode})` — org-guard; `resolveBuilderTelephony(orgId)` (→ `needs_telephony` if creds/trunk missing); build the client; call `provisionVoiceNumber`. Returns `{phoneNumber}` or typed error.
- [ ] **Step 2:** Extend cancel: when `numberOrigin==='provisioned'`, `releaseNumber(sid)` + null the number fields. Pause keeps the number (existing behavior).
- [ ] **Step 3:** tsc; check-use-server; commit `feat(telephony): provision/release deployment number actions`.

### Task 6: "Get a number" UI
**Files:** modify the deploy review step + `studio/clients/activate-form.tsx`.
- [ ] **Step 1:** Primary "Get a number" → area-code input (default from `clientContact` if derivable) → `provisionDeploymentNumberAction` → spinner ("Provisioning…") → show live E.164 + Active. Keep "use a number I own" (the existing paste path) as a secondary option. Error states: `no_numbers_available` ("try another area code"), `needs_telephony` ("connect Twilio + set your voice trunk in Settings"), `attach_failed` (retry).
- [ ] **Step 2:** tsc; commit `feat(telephony): Get-a-number activation UI`.

---

## Phase 3 — deployment persona isolation (carry-forward from the Fix Pass)

### Task 7: a deployed agent speaks as the CLIENT, not the builder
**Files:** modify `lib/agents/voice/deployment-voice.ts` (+ its spec).
- [ ] **Step 1:** Update `loadDeploymentVoiceContext` so the persona's business identity is the **client's** (`deployment.clientName`), and compose with **`soul: null`** (do NOT pass the builder's soul — same bug class as the test path). Keep the builder org for the tool ctx + booking + timezone/intake (per-client calendar is still a later refinement). Pass `clientName` into the context args.
- [ ] **Step 2:** Update the existing deployment-voice unit tests to assert the composed persona does NOT include the builder soul and uses the client name. Green.
- [ ] **Step 3:** tsc; commit `fix(telephony): deployed agent persona uses client identity, not builder soul`.

---

## Phase 4 — verify + live test
- [ ] **Step 1:** Full telephony + deployments + deployment-voice unit suites green; tsc 0 new; check-use-server.
- [ ] **Step 2 (Max — live):** In Settings, set Seldon Studio's `voiceTrunkSid` (the 839 trunk). Deploy a voice agent → "Get a number" (area code) → confirm a real number is bought + attached → **call it** → it answers as the client's agent (NOT Seldon Studio) + books → confirm the 839 line still works → cancel → confirm the number is released. Watch `voice_call_deployment_resolved`.

---

## MUST-VERIFY (from the spec — confirm at live test)
1. The dialed E.164 lands in OpenAI's `realtime.call.incoming` `To` header exactly as `resolveDeploymentByNumber` expects.
2. A freshly-bought number attaches to the existing trunk + routes to OpenAI on the first call.
3. `releaseNumber` cleanly detaches from the trunk.

## Out of scope (later)
Per-builder subaccounts + passthrough wallet (Phase 3 billing) · per-client cal.diy calendar · outbound SMS / A2P · the 5% application_fee.
