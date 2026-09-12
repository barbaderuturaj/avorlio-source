"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { createOrGetOnboardingLinkAction } from "@/lib/onboarding/link-action";

export function OnboardingLinkButton({ workspaceId }: { workspaceId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  return <button type="button" className="crm-pressable inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300" onClick={() => startTransition(async () => { const result = await createOrGetOnboardingLinkAction(workspaceId); setUrl(result.url); await navigator.clipboard.writeText(result.url); setCopied(true); setTimeout(() => setCopied(false), 1500); })} disabled={pending}>{pending ? "Preparing link…" : copied ? <><Check className="size-4" /> Copied onboarding link</> : <><Copy className="size-4" /> Copy onboarding link</>}{url ? <span className="sr-only">{url}</span> : null}</button>;
}
