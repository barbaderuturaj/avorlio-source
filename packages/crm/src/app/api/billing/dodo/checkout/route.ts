import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentWorkspaceRole, getOrgId } from "@/lib/auth/helpers";
import { createDodoPlatformCheckout } from "@/lib/billing/dodo-checkout";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const activeOrgId = await getOrgId();
  const role = await getCurrentWorkspaceRole();
  if (!user?.id || !activeOrgId || role !== "admin") {
    return NextResponse.json({ error: "Administrator authorization required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { orgId?: unknown; customerEmail?: unknown; customerName?: unknown };
  const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : user.email?.trim() ?? "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : user.name?.trim() ?? "Avorlio customer";
  if (!orgId || orgId !== activeOrgId || !customerEmail) {
    return NextResponse.json({ error: "A valid active organization and customer email are required" }, { status: 400 });
  }

  try {
    const result = await createDodoPlatformCheckout({ orgId, customerEmail, customerName });
    return NextResponse.json({ checkout_url: result.checkoutUrl });
  } catch (error) {
    console.error("[dodo/checkout] failed", error);
    return NextResponse.json({ error: "Dodo checkout is not configured" }, { status: 503 });
  }
}

