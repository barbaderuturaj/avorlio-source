// Avorlio HVAC V1 defers SMS and operator messaging. Website chat history is
// not currently represented by smsMessages, so this route returns to Today.

import { redirect } from "next/navigation";
import { requireOperatorSessionForOrg } from "@/lib/operator-portal/auth";

export default async function OperatorThreadPage({
  params,
}: {
  params: Promise<{ orgSlug: string; contactId: string }>;
}) {
  const { orgSlug } = await params;
  await requireOperatorSessionForOrg(orgSlug);
  redirect(`/portal/${orgSlug}`);
}
