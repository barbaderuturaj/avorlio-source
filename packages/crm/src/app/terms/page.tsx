import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Avorlio",
  description: "Terms governing use of Avorlio.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Terms of Service — Avorlio</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 8, 2026</p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">1. About Avorlio</h2>
          <p>
            Avorlio provides an AI front office for service businesses. Depending on the
            configuration selected by a customer, Avorlio may capture website leads, answer
            approved business questions, collect lead information, help qualify prospects,
            schedule appointments, connect with calendars, and send email follow-up.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">2. Your account and business</h2>
          <p>
            You must provide accurate account and business information and have authority to use
            Avorlio for the business you configure. You are responsible for keeping your account
            credentials secure and for activity performed through your account.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">3. Customer responsibilities</h2>
          <p>
            You are responsible for the accuracy of business information, services, pricing,
            availability, policies, emergency instructions, and other content supplied to Avorlio.
            You are also responsible for providing any notices or obtaining any consents required
            when collecting or communicating with your customers and leads.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">4. AI-generated responses</h2>
          <p>
            AI systems can make mistakes. Avorlio is designed to use approved business information
            and guardrails, but generated responses should not be treated as professional, medical,
            legal, financial, safety, or emergency advice. Businesses remain responsible for
            reviewing their configuration and providing appropriate escalation instructions.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">5. Bookings and integrations</h2>
          <p>
            Avorlio may connect to third-party services such as calendar, email, AI, and
            infrastructure providers. Their services are governed by their own terms and may
            occasionally be unavailable or change independently of Avorlio. Appointment
            availability also depends on the calendar and booking rules configured by the
            business.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">6. Fees</h2>
          <p>
            Paid services, setup fees, recurring charges, and included features are governed by
            the price or written offer agreed with you at purchase or onboarding. Avorlio will not
            impose a recurring paid plan without the applicable purchase or agreement.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">7. Acceptable use</h2>
          <p>You may not use Avorlio to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>violate applicable law or another person&apos;s rights;</li>
            <li>send unlawful, deceptive, abusive, or unauthorized communications;</li>
            <li>attempt to gain unauthorized access to systems, accounts, or data;</li>
            <li>interfere with the security or operation of the service; or</li>
            <li>misrepresent generated output as guaranteed professional advice.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">8. Your content and data</h2>
          <p>
            You retain responsibility for and rights in business content and customer data you
            provide, subject to the rights required for Avorlio to host, process, transmit, and
            display that information solely to operate and improve the service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">9. Open-source software</h2>
          <p>
            Avorlio is based on and modifies SeldonFrame. Corresponding source code for the
            deployed Avorlio version is made available under the GNU Affero General Public License
            version 3 (AGPL-3.0).
          </p>
          <a
            href="https://github.com/barbaderuturaj/avorlio-source"
            className="mt-2 inline-block underline underline-offset-4"
          >
            Avorlio source code · AGPL-3.0
          </a>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">10. Availability and changes</h2>
          <p>
            We work to keep Avorlio available and reliable, but uninterrupted operation is not
            guaranteed. Features may be changed, improved, suspended, or removed when reasonably
            necessary for security, reliability, legal compliance, or product operation.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">11. Disclaimer and liability</h2>
          <p>
            To the extent permitted by applicable law, Avorlio is provided on an “as available”
            basis without guarantees that every lead will convert, every message will be delivered,
            or every appointment will result in revenue. To the extent permitted by applicable law,
            Avorlio is not liable for indirect, incidental, special, consequential, or lost-profit
            damages arising from use of the service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">12. Suspension and termination</h2>
          <p>
            Access may be suspended or terminated for material violations of these Terms, unlawful
            use, security threats, or non-payment of agreed charges. You may stop using Avorlio at
            any time, subject to any active paid agreement.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">13. Changes to these Terms</h2>
          <p>
            These Terms may be updated as Avorlio changes. The current version and its effective
            date will be published on this page.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">14. Contact</h2>
          <p>
            Questions about these Terms can be sent to{" "}
            <a href="mailto:hello@avorlio.com" className="underline underline-offset-4">
              hello@avorlio.com
            </a>.
          </p>
        </section>
      </div>

      <div className="mt-12 flex gap-5 border-t pt-6 text-sm">
        <Link href="/" className="underline underline-offset-4">Home</Link>
        <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
      </div>
    </main>
  );
}
