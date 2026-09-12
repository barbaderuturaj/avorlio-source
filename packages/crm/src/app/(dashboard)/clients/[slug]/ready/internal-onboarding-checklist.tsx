"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import type { ChecklistViewItem } from "@/lib/onboarding/internal-checklist";
import { summarizeChecklist } from "@/lib/onboarding/internal-checklist";
import { toggleInternalOnboardingChecklistItem } from "./checklist-actions";

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  onboardingStatus: "pending" | "received";
  onboardingHref: string | null;
  items: ChecklistViewItem[];
  hrefs: Partial<Record<ChecklistViewItem["id"], string>>;
};

export function InternalOnboardingChecklist({ workspaceId, workspaceSlug, onboardingStatus, onboardingHref, items: initialItems, hrefs }: Props) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const summary = summarizeChecklist(items);
  const percent = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);

  function toggle(item: ChecklistViewItem, completed: boolean) {
    setPendingId(item.id);
    startTransition(async () => {
      const result = await toggleInternalOnboardingChecklistItem({ workspaceId, workspaceSlug, itemId: item.id, completed });
      if (result.ok) {
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, completed } : candidate));
      }
      setPendingId(null);
    });
  }

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6" aria-labelledby="hvac-launch-checklist-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Internal agency workflow</p>
          <h2 id="hvac-launch-checklist-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground">HVAC Launch Checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">Internal setup checklist — visible only to your agency team.</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-2xl font-semibold tabular-nums text-foreground">{summary.completed} / {summary.total}</p>
          <p className="text-xs text-muted-foreground">{percent}% complete</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70" aria-label={`${percent}% complete`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2.5 py-1 font-medium ${onboardingStatus === "received" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          Customer onboarding {onboardingStatus === "received" ? "received" : "pending"}
        </span>
        {onboardingHref ? <Link href={onboardingHref} className="inline-flex items-center gap-1 text-primary hover:underline">Review submission <ExternalLink className="size-3" aria-hidden="true" /></Link> : null}
      </div>

      <ul className="mt-5 divide-y divide-border/70 rounded-xl border border-border/70 bg-card/50">
        {items.map((item) => {
          const busy = isPending && pendingId === item.id;
          return (
            <li key={item.id} className="flex items-start gap-3 p-3.5 sm:p-4">
              <label className="mt-0.5 flex shrink-0 cursor-pointer items-center">
                <input type="checkbox" checked={item.completed} disabled={isPending} onChange={(event) => toggle(item, event.target.checked)} className="size-4 accent-primary" aria-label={`${item.completed ? "Uncheck" : "Check off"} ${item.label}`} />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-medium ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.label}</span>
                  {item.required ? <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Required</span> : <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Optional</span>}
                  {busy ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Saving" /> : item.completed ? <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Completed" /> : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
              {hrefs[item.id] ? <Link href={hrefs[item.id]!} className="shrink-0 text-xs font-medium text-primary hover:underline">Open <span aria-hidden="true">→</span></Link> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
