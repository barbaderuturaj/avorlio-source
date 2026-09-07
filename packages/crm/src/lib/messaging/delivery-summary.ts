export type DeliveryStatusRow = {
  status: string | null | undefined;
};

export type DeliveryStatusCounts = {
  total: number;
  sent: number;
  queued: number;
  failed: number;
  other: number;
};

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

export function isSuccessfulDeliveryStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "sent" || normalized === "delivered";
}

export function isQueuedDeliveryStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "queued" || normalized === "pending" || normalized === "draft";
}

export function isFailedDeliveryStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "failed" || normalized === "bounced";
}

export function buildDeliveryStatusCounts(rows: DeliveryStatusRow[]): DeliveryStatusCounts {
  const counts: DeliveryStatusCounts = {
    total: rows.length,
    sent: 0,
    queued: 0,
    failed: 0,
    other: 0,
  };

  for (const row of rows) {
    if (isSuccessfulDeliveryStatus(row.status)) {
      counts.sent += 1;
    } else if (isQueuedDeliveryStatus(row.status)) {
      counts.queued += 1;
    } else if (isFailedDeliveryStatus(row.status)) {
      counts.failed += 1;
    } else {
      counts.other += 1;
    }
  }

  return counts;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatDeliveryStatusSummary(counts: DeliveryStatusCounts): string {
  if (counts.total === 0) {
    return "No message records yet";
  }

  const parts: string[] = [];
  if (counts.sent > 0 || counts.queued > 0 || counts.failed > 0) {
    parts.push(`${counts.sent} sent`);
  }
  if (counts.queued > 0) {
    parts.push(`${counts.queued} queued`);
  }
  if (counts.failed > 0) {
    parts.push(`${counts.failed} failed`);
  }
  if (counts.other > 0) {
    parts.push(pluralize(counts.other, "other record"));
  }

  return parts.join(" · ");
}

