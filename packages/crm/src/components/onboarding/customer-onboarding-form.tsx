"use client";

import { useState, useTransition } from "react";
import { HVAC_ONBOARDING_STEP_TITLES, fieldsForStep, type HvacField } from "@/lib/onboarding/hvac-form-definition";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomerOnboardingForm({ token, operatorEmail }: { token: string; operatorEmail?: string | null }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Record<string, string | string[]>>({ notification_email: operatorEmail ?? "", portal_email: operatorEmail ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const fields = fieldsForStep(step);
  const setValue = (key: string, value: string | string[]) => setValues((current) => ({ ...current, [key]: value }));
  const isEmpty = (v: string | string[] | undefined) => !v || (Array.isArray(v) ? v.length === 0 : !v.trim());

  function validate() {
    for (const field of fields) {
      const value = values[field.key];
      if (field.key === "emergency_phone" && values.emergency_service !== "Yes") continue;
      if (field.required && isEmpty(value)) return `${field.label} is required.`;
      if (field.type === "email" && !isEmpty(value) && typeof value === "string" && !EMAIL.test(value.trim())) return `Enter a valid email for ${field.label}.`;
    }
    return null;
  }

  function next() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError(null);
    if (step < 7) { if (step === 6 && typeof values.operator_email === "string") setValues((current) => ({ ...current, notification_email: current.notification_email || values.operator_email as string, portal_email: current.portal_email || values.operator_email as string })); setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    startTransition(async () => {
      const response = await fetch(`/api/v1/onboarding/${encodeURIComponent(token)}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: values }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error ?? "We couldn't save your onboarding details. Please try again."); return; }
      setDone(true);
    });
  }

  if (done) return <Completion />;
  return <main className="min-h-screen bg-[#f4f6f5] px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-3xl"><p className="mb-8 text-center text-sm font-semibold tracking-[0.2em] text-emerald-700">AVORLIO</p><section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-10"><div className="mb-8"><div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Step {step} of 7</span><span>{HVAC_ONBOARDING_STEP_TITLES[step - 1]}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(step / 7) * 100}%` }} /></div></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{HVAC_ONBOARDING_STEP_TITLES[step - 1]}</h1><p className="mt-2 text-sm text-slate-500">We’ll use this information to configure your Avorlio workspace.</p>{step === 4 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Do not send us your Google password. We’ll connect Calendar securely.</p>}{step === 6 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Never send passwords in this form. If temporary access is needed, we’ll arrange it securely.</p>}<div className="mt-8 space-y-6">{fields.map((field) => <FieldInput key={field.key} field={field} value={values[field.key] ?? ""} onChange={(value) => setValue(field.key, value)} visible={field.key !== "emergency_phone" || values.emergency_service === "Yes"} />)}</div>{error && <p className="mt-6 text-sm text-red-600" role="alert">{error}</p>}<div className="mt-10 flex items-center justify-between"><button type="button" onClick={() => { setError(null); setStep(Math.max(1, step - 1)); }} disabled={step === 1 || pending} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 disabled:opacity-30">Back</button><button type="button" onClick={next} disabled={pending} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : step === 7 ? "Finish onboarding" : "Continue"}</button></div></section></div></main>;
}

function FieldInput({ field, value, onChange, visible }: { field: HvacField; value: string | string[]; onChange: (value: string | string[]) => void; visible: boolean }) {
  if (!visible) return null;
  const label = <label className="block text-sm font-medium text-slate-800">{field.label}{field.required ? <span className="ml-1 text-emerald-700">*</span> : <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>}</label>;
  if (field.type === "select") return <div className="space-y-2">{label}<select value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="">Select one</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
  if (field.type === "multi-select") { const selected = Array.isArray(value) ? value : []; return <fieldset className="space-y-2">{label}<div className="grid gap-2 sm:grid-cols-2">{field.options?.map((option) => <label key={option} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(option)} onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>)}</div></fieldset>; }
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-600";
  if (field.type === "textarea") return <div>{label}<textarea rows={4} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className={inputClass} /></div>;
  return <div>{label}<input type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className={inputClass} /></div>;
}

function Completion() { return <main className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4 py-10"><section className="max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-12"><p className="text-sm font-semibold tracking-[0.2em] text-emerald-700">AVORLIO</p><h1 className="mt-6 text-3xl font-semibold">You&apos;re all set.</h1><p className="mt-4 text-sm leading-6 text-slate-600">Thanks — we&apos;ve received your HVAC setup details.<br /><br />Avorlio will now configure your AI Front Office, booking flow, and client portal.<br />We&apos;ll contact you if we need anything else.</p><h2 className="mt-8 text-left text-lg font-semibold">What happens next</h2><ol className="mt-3 space-y-2 text-left text-sm text-slate-600"><li>1. We configure your workspace</li><li>2. We connect your calendar</li><li>3. We install Avorlio on your website</li><li>4. We send your client-portal access</li></ol><p className="mt-8 text-sm text-slate-500">Questions? <a className="font-medium text-emerald-700 underline" href="mailto:hello@avorlio.com">hello@avorlio.com</a></p></section></main>; }
