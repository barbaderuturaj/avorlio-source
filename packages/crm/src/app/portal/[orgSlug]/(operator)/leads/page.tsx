// v1 PWA — Leads screen.
//
// Mobile card list of this workspace's contacts (newest first) with
// name, status, source, and relative created time. Reuses listContacts({ orgId }) — the same query the
// desktop /contacts grid uses, scoped via the operator session orgId.

import { getOperatorSessionForOrg } from "@/lib/operator-portal/auth";
import { listContacts } from "@/lib/contacts/actions";
import {
  contactDisplayName,
  formatRelative,
} from "@/lib/operator-portal/mobile-format";

export default async function OperatorLeadsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await getOperatorSessionForOrg(orgSlug);
  if (!session) return null;

  const contacts = await listContacts({ orgId: session.orgId, sort: "recent" });

  return (
    <section className="flex flex-col gap-3 px-4 py-4">
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight" style={{ color: "#111" }}>
          Leads
        </h1>
        <p className="text-[13px]" style={{ color: "#777" }}>
          {contacts.length === 0
            ? "No leads yet — they'll show up here as they come in."
            : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      {contacts.length === 0 ? null : (
        <ul className="flex flex-col gap-2.5">
          {contacts.map((c) => {
            const name = contactDisplayName({
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
            });
            return (
              <li
                key={c.id}
                className="rounded-2xl bg-white p-3.5"
                style={{ border: "1px solid #E5E5E1" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold" style={{ color: "#111" }}>
                      {name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]" style={{ color: "#888" }}>
                      <span className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: "#F0F0EC", color: "#555" }}>
                        {c.status}
                      </span>
                      {c.source ? <span>via {c.source}</span> : null}
                      <span>{formatRelative(new Date(c.createdAt))}</span>
                    </div>
                    {c.phone ? (
                      <p className="mt-1 text-[12px]" style={{ color: "#666" }}>{c.phone}</p>
                    ) : null}
                  </div>
                </div>

              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
