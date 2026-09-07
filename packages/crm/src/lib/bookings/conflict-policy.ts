/**
 * Booking rows that reserve workspace time.
 *
 * Public slot listing, submit-time validation, and rescheduling must use the
 * same set. Keeping this outside the server-action module makes the policy
 * independently testable and prevents the picker from offering a slot that
 * the write path will reject.
 */
export const PUBLIC_BOOKING_BLOCKING_STATUSES = [
  "scheduled",
  "completed",
  "pending_payment",
  "blocked",
] as const;

export type PublicBookingBlockingStatus =
  (typeof PUBLIC_BOOKING_BLOCKING_STATUSES)[number];

export function isPublicBookingBlockingStatus(
  status: string | null | undefined,
): status is PublicBookingBlockingStatus {
  return PUBLIC_BOOKING_BLOCKING_STATUSES.includes(
    status as PublicBookingBlockingStatus,
  );
}
