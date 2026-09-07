export function normalizeTwilioStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function buildTwilioStatusProviderEventId(params: {
  externalMessageId: string;
  status: string;
}): string {
  return `twilio:${params.externalMessageId.trim()}:${normalizeTwilioStatus(params.status)}`;
}

export type TwilioStatusEventInput = {
  orgId: string;
  smsMessageId: string;
  externalMessageId: string;
  status: string;
  rawBody: Record<string, string>;
};

export type TwilioStatusEventRecord = {
  orgId: string;
  smsMessageId: string;
  eventType: string;
  provider: "twilio";
  providerEventId: string;
  payload: Record<string, string>;
};

export type RecordTwilioStatusEventDeps = {
  insertEvent: (event: TwilioStatusEventRecord) => Promise<{ id: string } | null>;
};

export async function recordTwilioStatusEventOnce(
  input: TwilioStatusEventInput,
  deps: RecordTwilioStatusEventDeps,
): Promise<{ inserted: true; providerEventId: string } | { inserted: false; providerEventId: string }> {
  const providerEventId = buildTwilioStatusProviderEventId({
    externalMessageId: input.externalMessageId,
    status: input.status,
  });

  const inserted = await deps.insertEvent({
    orgId: input.orgId,
    smsMessageId: input.smsMessageId,
    eventType: `sms.${normalizeTwilioStatus(input.status)}`,
    provider: "twilio",
    providerEventId,
    payload: input.rawBody,
  });

  return inserted ? { inserted: true, providerEventId } : { inserted: false, providerEventId };
}

export function buildUnmatchedInboundSmsLogPayload(params: {
  orgId: string;
  fromNumber: string;
  toNumber: string;
  externalMessageId: string;
}) {
  return {
    org_id: params.orgId,
    from: params.fromNumber,
    to: params.toNumber,
    external_id: params.externalMessageId,
    hidden_from_dashboard_inbox: true,
  };
}
