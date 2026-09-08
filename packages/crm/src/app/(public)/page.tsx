import type { Metadata } from "next";

const DEMO_URL = "https://app.avorlio.com/w/golden-hvac-test";
const CONTACT_URL =
  "mailto:hello@avorlio.com?subject=Avorlio%20for%20my%20HVAC%20company";

export const metadata: Metadata = {
  title: "Avorlio for HVAC — Never Miss Another HVAC Lead",
  description:
    "Avorlio is a done-for-you AI front office for HVAC companies. Capture website leads, answer approved questions, qualify prospects, book appointments, and follow up automatically.",
  alternates: {
    canonical: "https://avorlio.com",
  },
  openGraph: {
    title: "Avorlio for HVAC — Never Miss Another HVAC Lead",
    description:
      "A done-for-you AI front office for HVAC companies that turns website inquiries into booked appointments.",
    url: "https://avorlio.com",
    type: "website",
  },
};

const outcomes = [
  {
    title: "Answer instantly",
    body: "Respond to website visitors 24/7 using the HVAC information you approve.",
  },
  {
    title: "Qualify the lead",
    body: "Collect contact details, service needs, and the information your team needs before calling back.",
  },
  {
    title: "Book the appointment",
    body: "Show available times and place confirmed appointments directly onto your connected Google Calendar.",
  },
];

const capabilities = [
  "24/7 website chatbot",
  "HVAC FAQ answering",
  "Lead capture & qualification",
  "Appointment booking",
  "Google Calendar sync",
  "Automatic email follow-up",
];

export default function AvorlioHomePage() {
  return (
    <main className="min-h-screen bg-[#0b0d10] text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="text-xl font-semibold tracking-tight">
          Avorlio
        </a>

        <div className="flex items-center gap-5 text-sm text-white/70">
          <a href="#how-it-works" className="hidden hover:text-white sm:block">
            How it works
          </a>
          <a href={DEMO_URL} className="hidden hover:text-white sm:block">
            Live demo
          </a>
          <a
            href="https://app.avorlio.com/login"
            className="rounded-lg border border-white/15 px-4 py-2 text-white transition hover:bg-white/5"
          >
            Log in
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pb-32 md:pt-24">
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
            Built for HVAC companies
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl md:text-7xl">
            Never miss another HVAC lead.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
            Avorlio is your done-for-you AI front office. It answers website
            visitors, qualifies homeowners, captures their details, books
            appointments, and follows up automatically — 24/7.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={DEMO_URL}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3.5 font-medium text-black transition hover:bg-white/90"
            >
              See the live HVAC demo →
            </a>

            <a
              href={CONTACT_URL}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3.5 font-medium text-white transition hover:bg-white/5"
            >
              Get Avorlio for your HVAC company
            </a>
          </div>

          <p className="mt-5 text-sm text-white/40">
            No complicated software setup for your team. We configure the front
            office around your HVAC business.
          </p>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-white/10 bg-white/[0.025]"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">
            From website visitor to appointment
          </p>

          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Your website keeps working after your office closes.
          </h2>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {outcomes.map((item, index) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
              >
                <div className="mb-8 text-sm text-emerald-300">
                  0{index + 1}
                </div>
                <h3 className="text-xl font-medium">{item.title}</h3>
                <p className="mt-3 leading-7 text-white/55">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">
              What Avorlio handles
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              The repetitive front-office work that costs HVAC companies leads.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <div
                key={capability}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white/75"
              >
                <span className="mr-3 text-emerald-300">✓</span>
                {capability}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] px-7 py-10 md:px-12 md:py-14">
          <p className="text-sm text-emerald-300">Avorlio for HVAC</p>

          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            See what your customers experience before you buy anything.
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-white/55">
            Open the live Golden HVAC demo, ask a real service question, and
            walk through the booking experience yourself.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={DEMO_URL}
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-medium text-black"
            >
              Open live HVAC demo →
            </a>
            <a
              href={CONTACT_URL}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3 font-medium"
            >
              Talk to Avorlio
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8 text-sm text-white/45 sm:flex-row sm:items-center">
          <span>© 2026 Avorlio</span>

          <div className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto">
            <a href="mailto:hello@avorlio.com" className="hover:text-white">
              hello@avorlio.com
            </a>
            <a href="/terms" className="hover:text-white">
              Terms
            </a>
            <a href="/privacy" className="hover:text-white">
              Privacy
            </a>
            <a
              href="https://github.com/barbaderuturaj/avorlio-source"
              className="hover:text-white"
            >
              Source Code · AGPL-3.0
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
