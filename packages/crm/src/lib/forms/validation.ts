import type { IntakeFormField } from "@/db/schema/intake-forms";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePublicIntakeAnswers(
  fields: IntakeFormField[],
  answers: Record<string, unknown>,
): string | null {
  for (const field of fields) {
    const raw = answers[field.key];
    const value = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();
    if (field.required && !value) return `The field "${field.label}" is required.`;
    if (!value) continue;
    if (field.type === "email" && !EMAIL_PATTERN.test(value)) return `The field "${field.label}" must be a valid email address.`;
    if (field.type === "tel" || field.type === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 7 || /^([0-9])\1+$/.test(digits)) return `The field "${field.label}" must be a valid phone number.`;
    }
  }
  return null;
}
