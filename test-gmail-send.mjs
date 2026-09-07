import { composioForOrg, listConnections } from "./packages/crm/src/lib/integrations/composio/client.ts";

const orgId = "e50aee42-f3e5-41c7-99fa-5e7db508651d";
const recipient = "barbaderuturaj@gmail.com";

const composio = await composioForOrg(orgId);
if (!composio) throw new Error("No Composio client");

const connections = await listConnections(orgId, { client: composio });

const gmail = connections.find(
  (c) => c.slug === "gmail" && c.connected && c.connectedAccountId
);

if (!gmail?.connectedAccountId) {
  throw new Error("Gmail not connected");
}

const res = await composio.tools.execute("GMAIL_SEND_EMAIL", {
  userId: orgId,
  connectedAccountId: gmail.connectedAccountId,
  dangerouslySkipVersionCheck: true,
  arguments: {
    recipient_email: recipient,
    subject: "SeldonFrame Gmail QA Test",
    body: "This is a controlled Gmail send test from SeldonFrame. No action is required.",
  },
});

console.log(JSON.stringify(res, null, 2));
