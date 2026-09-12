export type PublicBookingDealStage = {
  name: string;
  probability?: number | null;
};

export type PublicBookingActivityInput = {
  orgId: string;
  contactId: string | null;
  dealId: string | null;
  bookingId: string;
  bookingSlug: string;
  appointmentName: string;
  startsAt: Date;
  notes?: string | null;
  intakeResponses?: Record<string, string>;
};

export type PublicBookingActivityDeps = {
  resolveActivityUserId: (orgId: string) => Promise<string | null>;
  createActivity: (values: {
    orgId: string;
    userId: string;
    contactId: string;
    dealId: string | null;
    type: "note";
    subject: "Booking scheduled";
    body: string;
    metadata: Record<string, unknown>;
    scheduledAt: Date;
  }) => Promise<void>;
  log: (event: Record<string, unknown>, level: "info" | "warn" | "error") => void;
};

export function selectPublicBookingDealStage(stages: PublicBookingDealStage[]) {
  const bookedStageRe =
    /\b(booked|scheduled|trial|appointment|consult(ation)?|reservation|reserved)\b/i;
  const matchedStage = stages.find((stage) => bookedStageRe.test(stage.name));
  const targetStage = matchedStage ?? stages[0];
  return {
    stage: targetStage?.name ?? "Lead",
    probability: targetStage?.probability ?? 0,
    matched: Boolean(matchedStage),
  };
}

function firstString(values: Record<string, string> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = values?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function buildPublicBookingActivityBody(input: PublicBookingActivityInput): string {
  const responses = input.intakeResponses ?? {};
  const issue = firstString(responses, ["issue_type", "issue", "requested_service", "service"]);
  const urgency = firstString(responses, ["urgency"]);

  const lines = [
    `Appointment: ${input.appointmentName}`,
    `Scheduled for: ${input.startsAt.toISOString()}`,
    issue ? `Issue/service: ${issue}` : null,
    urgency ? `Urgency: ${urgency}` : null,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : null,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export async function createPublicBookingActivityProjection(
  input: PublicBookingActivityInput,
  deps: PublicBookingActivityDeps,
): Promise<{ created: boolean; skippedReason?: string }> {
  if (!input.contactId) {
    deps.log(
      {
        event: "public_booking_activity_skipped",
        reason: "no_contact",
        org_id: input.orgId,
        booking_id: input.bookingId,
      },
      "warn",
    );
    return { created: false, skippedReason: "no_contact" };
  }

  const userId = await deps.resolveActivityUserId(input.orgId);
  if (!userId) {
    deps.log(
      {
        event: "public_booking_activity_skipped",
        reason: "no_org_user",
        org_id: input.orgId,
        booking_id: input.bookingId,
        contact_id: input.contactId,
      },
      "warn",
    );
    return { created: false, skippedReason: "no_org_user" };
  }

  await deps.createActivity({
    orgId: input.orgId,
    userId,
    contactId: input.contactId,
    dealId: input.dealId,
    type: "note",
    subject: "Booking scheduled",
    body: buildPublicBookingActivityBody(input),
    metadata: {
      source: "public-booking",
      bookingId: input.bookingId,
      bookingSlug: input.bookingSlug,
      appointmentName: input.appointmentName,
      startsAt: input.startsAt.toISOString(),
    },
    scheduledAt: input.startsAt,
  });

  deps.log(
    {
      event: "public_booking_activity_created",
      org_id: input.orgId,
      booking_id: input.bookingId,
      contact_id: input.contactId,
      deal_id: input.dealId,
    },
    "info",
  );
  return { created: true };
}

