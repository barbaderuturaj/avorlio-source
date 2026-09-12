import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — Avorlio",
  description: "Refund and cancellation policy for Avorlio subscriptions.",
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <a href="https://avorlio.com" className="text-sm font-medium">
          ← Avorlio
        </a>

        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          Refund Policy
        </h1>

        <p className="mt-3 text-sm text-neutral-500">
          Last updated: September 8, 2026
        </p>

        <div className="mt-10 space-y-8 leading-7 text-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              Subscription cancellations
            </h2>
            <p className="mt-3">
              Avorlio subscriptions are billed on a recurring basis. You may
              cancel your subscription at any time before the next renewal.
              Cancellation prevents future renewal charges. Access normally
              remains available through the end of the paid billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              Refunds
            </h2>
            <p className="mt-3">
              Subscription fees already paid for an active billing period are
              generally non-refundable. We will review refund requests for
              duplicate charges, billing errors, failure to provide purchased
              access, or where a refund is required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              Requesting a refund
            </h2>
            <p className="mt-3">
              Contact us at{" "}
              <a
                href="mailto:hello@avorlio.com"
                className="underline underline-offset-4"
              >
                hello@avorlio.com
              </a>{" "}
              with the email used for your purchase, the charge date, and the
              reason for your request. Please contact us as soon as possible
              after identifying an incorrect charge.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              Payment processor
            </h2>
            <p className="mt-3">
              Payments and eligible refunds may be processed through our
              authorized payment provider. Processing times after an approved
              refund can vary depending on the payment method and financial
              institution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              Changes to this policy
            </h2>
            <p className="mt-3">
              We may update this policy as Avorlio evolves. The current version
              will always be published on this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              Contact
            </h2>
            <p className="mt-3">
              Questions about cancellations or refunds can be sent to{" "}
              <a
                href="mailto:hello@avorlio.com"
                className="underline underline-offset-4"
              >
                hello@avorlio.com
              </a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
