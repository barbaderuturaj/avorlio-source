"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendMagicLinkAction } from "../signup/actions";
import type { MagicLinkActionState } from "../signup/actions";

const emailSchema = z.string().email();
const NEUTRAL_LOGIN_STATE: MagicLinkActionState = { sent: true };

export async function sendExistingUserMagicLinkAction(
  previousState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };

  const email = parsed.data.trim().toLowerCase();

  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser) return NEUTRAL_LOGIN_STATE;
  } catch (error) {
    console.error(
      `[auth][login] existing-user lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NEUTRAL_LOGIN_STATE;
  }

  try {
    await sendMagicLinkAction(previousState, formData);
  } catch (error) {
    console.error(
      `[auth][login] magic-link send failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return NEUTRAL_LOGIN_STATE;
}
