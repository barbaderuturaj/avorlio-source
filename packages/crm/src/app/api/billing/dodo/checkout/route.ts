import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/helpers";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { canManageWorkspace } from "@/lib/auth/managed-workspace";
import { createDodoPlatformCheckout } from "@/lib/billing/dodo-checkout";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) return NextResponse.json({ error: "Client workspace is required" }, { status: 400 });

  const [workspace] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (!workspace || !(await canManageWorkspace(workspace.id, user.id))) {
    return NextResponse.json({ error: "Client workspace authorization required" }, { status: 403 });
  }

  const customerEmail = user.email?.trim() ?? "";
  const customerName = user.name?.trim() ?? "Avorlio customer";
  if (!customerEmail) {
    return NextResponse.json({ error: "Your account needs an email before creating checkout" }, { status: 400 });
  }

  try {
    const result = await createDodoPlatformCheckout({ orgId: workspace.id, customerEmail, customerName });
    return NextResponse.json({ checkout_url: result.checkoutUrl });
  } catch (error) {
    console.error("[dodo/checkout] failed", error);
    return NextResponse.json({ error: "Dodo checkout is not configured" }, { status: 503 });
  }
}
