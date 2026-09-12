import { selectCRMPersonality } from "@/lib/crm/personality";

/**
 * Soul-created appointment prices have no provenance separate from the model
 * output. HVAC must therefore remain free until an operator explicitly adds a
 * paid appointment type through the booking configuration surface.
 */
export function resolveGeneratedSoulBookingPrice(input: {
  businessName: string;
  businessDescription: string;
  price: number | undefined;
}): number {
  const personality = selectCRMPersonality(
    "local_service",
    `${input.businessName} ${input.businessDescription}`,
  );

  if (personality.vertical === "hvac") return 0;

  return typeof input.price === "number" && Number.isFinite(input.price)
    ? Math.max(0, input.price)
    : 0;
}
