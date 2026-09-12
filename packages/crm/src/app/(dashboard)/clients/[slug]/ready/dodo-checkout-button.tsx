"use client";

import { useState } from "react";

import { createDodoCheckoutAction } from "./actions";

export function DodoCheckoutButton({ workspaceSlug }: { workspaceSlug: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCheckout() {
    setPending(true);
    setError(null);
    try {
      const result = await createDodoCheckoutAction(workspaceSlug);
      if (result.ok) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setError(result.error);
    } catch {
      setError("Checkout could not be created. Please try again.");
    }
    setPending(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={createCheckout}
        disabled={pending}
        className="crm-pressable inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creating checkout…" : "Create Dodo $299 Checkout"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
