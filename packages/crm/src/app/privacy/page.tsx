import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Avorlio",
  description: "How Avorlio collects and uses information.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">Privacy Policy — Avorlio</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 8, 2026</p>

      <div className="mt-10 space-y-8 text-base leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">1. Scope</h2>
          <p>
            This Privacy Policy explains how Avorlio handles information when people use
            avorlio.com, app.avorlio.com, Avorlio-hosted business pages, forms, booking pages,
            chat experiences, and related services.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">2. Information we collect</h2>
          <p>Depending on how Avorlio is used, we may process:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>account information such as name and email address;</li>
            <li>business profile, service, operating-hours, and booking information;</li>
            <li>
              lead and customer information such as name, email, phone number, service request,
              appointment details, and conversation content;
            </li>
            <li>workspace configuration and content supplied by the business;</li>
            <li>technical information such as request, device, security, and diagnostic data; and</li>
            <li>
              connection information needed to operate integrations that a customer chooses to
              enable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">3. How we use information</h2>
          <p>We process information to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>provide and secure Avorlio accounts and workspaces;</li>
            <li>capture and organize leads;</li>
            <li>answer configured business questions;</li>
            <li>qualify prospects and support appointment booking;</li>
            <li>connect bookings with enabled calendar integrations;</li>
            <li>send transactional and follow-up email when configured;</li>
            <li>provide support, troubleshoot problems, and prevent abuse; and</li>
            <li>maintain and improve reliability of the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">4. Business-customer data</h2>
          <p>
            Businesses using Avorlio may submit or collect information about their own customers
            and leads. In those situations, the business determines why that information is
            collected and is responsible for providing appropriate privacy notices and obtaining
            required permissions. Avorlio processes that information to provide the configured
            service to the business.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">5. Service providers and integrations</h2>
          <p>
            We use third-party infrastructure and service providers to operate Avorlio, including
            hosting, networking, email delivery, AI processing, authentication, and optional
            calendar integrations. Information is shared with those providers only as reasonably
            necessary to provide the relevant service or integration.
          </p>
          <p className="mt-3">
            When you intentionally connect a third-party account such as Google Calendar, the
            connected service also processes information under its own privacy policy and terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">6. Sharing of information</h2>
          <p>
            We do not sell personal information for money. We may disclose information to service
            providers described above, when a customer directs us to do so, when required by law,
            or when reasonably necessary to protect users, Avorlio, or the security of the service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">7. Data retention</h2>
          <p>
            Information is retained for as long as reasonably necessary to provide the service,
            maintain security and records, comply with applicable obligations, and resolve
            disputes. Retention periods may vary depending on the type of information and the
            customer&apos;s use of Avorlio.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">8. Security</h2>
          <p>
            We use reasonable technical and organizational safeguards intended to protect
            information against unauthorized access, loss, misuse, or alteration. No internet
            service or storage system can guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">9. International processing</h2>
          <p>
            Avorlio and its service providers may process information in countries other than the
            country where a user or business is located. Applicable safeguards and provider terms
            may therefore involve cross-border processing.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">10. Your choices and requests</h2>
          <p>
            Depending on applicable law and your relationship with Avorlio, you may request access,
            correction, deletion, or other action concerning your personal information. If your
            information was submitted to Avorlio by a business you contacted, that business may
            need to handle the request as the organization responsible for the data.
          </p>
          <p className="mt-3">
            Privacy requests can be sent to{" "}
            <a href="mailto:hello@avorlio.com" className="underline underline-offset-4">
              hello@avorlio.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">11. Children</h2>
          <p>
            Avorlio is a business service and is not intended to be used by children as an account
            holder or business operator.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">12. Open-source software</h2>
          <p>
            Corresponding source code for the deployed Avorlio application is available under the
            GNU Affero General Public License version 3 (AGPL-3.0). Publishing source code does not
            publish production credentials, private customer records, or account data.
          </p>
          <a
            href="https://github.com/barbaderuturaj/avorlio-source"
            className="mt-2 inline-block underline underline-offset-4"
          >
            Avorlio source code · AGPL-3.0
          </a>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">13. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy as Avorlio changes. The latest version and effective
            date will be published on this page.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-foreground">14. Contact</h2>
          <p>
            For privacy questions or requests, contact{" "}
            <a href="mailto:hello@avorlio.com" className="underline underline-offset-4">
              hello@avorlio.com
            </a>.
          </p>
        </section>
      </div>

      <div className="mt-12 flex gap-5 border-t pt-6 text-sm">
        <Link href="/" className="underline underline-offset-4">Home</Link>
        <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link>
      </div>
    </main>
  );
}
