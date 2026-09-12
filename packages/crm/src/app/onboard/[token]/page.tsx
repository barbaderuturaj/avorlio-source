import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { CustomerOnboardingForm } from "@/components/onboarding/customer-onboarding-form";
import { loadOnboardingLinkByToken } from "@/lib/onboarding/links";

export const dynamic = "force-dynamic";

export default async function OnboardTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await loadOnboardingLinkByToken(token);
  if (!link || link.status === "submitted" || link.status === "applied") {
    const alreadySubmitted = link?.status === "submitted";
    return <main className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-4"><section className="max-w-md rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-black/5"><p className="text-sm font-semibold tracking-[0.2em] text-emerald-700">AVORLIO</p><h1 className="mt-6 text-2xl font-semibold">{alreadySubmitted ? "Onboarding already submitted" : "This link is no longer active"}</h1><p className="mt-4 text-sm leading-6 text-slate-600">{alreadySubmitted ? "We already received these setup details. If you need to make a change, please contact hello@avorlio.com." : "Your onboarding link is invalid or has expired. If you believe this is a mistake, please contact hello@avorlio.com."}</p></section></main>;
  }
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, link.orgId)).limit(1);
  if (!org) return null;
  return <CustomerOnboardingForm token={token} />;
}
