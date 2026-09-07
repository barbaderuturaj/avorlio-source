import { composioForOrg, listConnections } from "./packages/crm/src/lib/integrations/composio/client.ts";

const orgId = "e50aee42-f3e5-41c7-99fa-5e7db508651d";

const composio = await composioForOrg(orgId);
if (!composio) throw new Error("No Composio client");

const connections = await listConnections(orgId, { client: composio });
const gmail = connections.find(
  (c) => c.slug === "gmail" && c.connected && c.connectedAccountId
);

if (!gmail?.connectedAccountId) throw new Error("Gmail not connected");

const res = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
  userId: orgId,
  connectedAccountId: gmail.connectedAccountId,
  dangerouslySkipVersionCheck: true,
  arguments: {
    query: "in:sent",
    max_results: 3,
  },
});

console.log(JSON.stringify(res, null, 2));
