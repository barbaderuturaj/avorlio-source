export type SmsInboxMessageRow = {
  contactId: string | null;
  direction: string;
  body: string;
  createdAt: Date;
};

export type SmsInboxThread = {
  contactId: string;
  lastMessageAt: Date;
  lastMessageBody: string;
  lastMessageDirection: "inbound" | "outbound";
  unreadCount: number;
};

export function buildSmsInboxThreads(rows: SmsInboxMessageRow[]): SmsInboxThread[] {
  const threadMap = new Map<
    string,
    {
      contactId: string;
      lastMessageAt: Date;
      lastMessageBody: string;
      lastMessageDirection: "inbound" | "outbound";
      hasInbound: boolean;
      seenOutbound: boolean;
      unreadCount: number;
    }
  >();

  for (const row of rows) {
    if (!row.contactId) continue;
    const direction = row.direction === "outbound" ? "outbound" : "inbound";
    let thread = threadMap.get(row.contactId);
    if (!thread) {
      thread = {
        contactId: row.contactId,
        lastMessageAt: row.createdAt,
        lastMessageBody: row.body,
        lastMessageDirection: direction,
        hasInbound: false,
        seenOutbound: false,
        unreadCount: 0,
      };
      threadMap.set(row.contactId, thread);
    }
    if (direction === "inbound") {
      thread.hasInbound = true;
      if (!thread.seenOutbound) thread.unreadCount += 1;
    } else {
      thread.seenOutbound = true;
    }
  }

  return Array.from(threadMap.values())
    .filter((thread) => thread.hasInbound)
    .map((thread) => ({
      contactId: thread.contactId,
      lastMessageAt: thread.lastMessageAt,
      lastMessageBody: thread.lastMessageBody,
      lastMessageDirection: thread.lastMessageDirection,
      unreadCount: thread.unreadCount,
    }))
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export function shouldShowDisconnectedPhoneEmptyState(params: {
  phoneConnected: boolean;
  threadCount: number;
}): boolean {
  return !params.phoneConnected && params.threadCount === 0;
}
