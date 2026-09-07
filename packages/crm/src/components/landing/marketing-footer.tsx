import Link from "next/link";

import { BrandMark } from "./brand-mark";

type FooterLink = { label: string; href: string };
type Column = { heading: string; links: readonly FooterLink[] };

const COLUMNS: readonly Column[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "#build" },
      { label: "What Avorlio handles", href: "#modules" },
      { label: "Questions", href: "#faq" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Start with your business", href: "/#hero-form" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Source Code · AGPL-3.0", href: "https://github.com/barbaderuturaj/avorlio-source" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer
      aria-labelledby="footer-heading"
      className="border-t border-[var(--lp-border-soft)] bg-[var(--lp-bg-alt)] px-5 pb-12 pt-16 text-[var(--lp-muted)] md:px-8 md:pb-14 md:pt-20 lg:px-12 lg:pb-16 lg:pt-24"
    >
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      <div className="mx-auto max-w-[1120px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)] md:gap-8">
          <div className="flex max-w-[340px] flex-col gap-5">
            <Link href="/" aria-label="Avorlio - home" className="inline-flex items-center">
              <BrandMark size={22} />
            </Link>
            <p className="m-0 text-[13.5px] leading-[1.55] text-[var(--lp-muted)]">
              Avorlio is the AI front office for service businesses: capture leads, answer questions,
              book appointments, and follow up automatically.
            </p>
            <Link
              href="/#hero-form"
              className="inline-flex items-center gap-2 self-start rounded-[11px] bg-[var(--lp-cta-bg)] px-4 py-2.5 text-[13px] font-[500] text-[var(--lp-cta-ink)] shadow-[0_1px_2px_color-mix(in_oklab,var(--lp-ink)_10%,transparent),0_4px_12px_color-mix(in_oklab,var(--lp-ink)_8%,transparent),inset_0_1.5px_0_rgba(255,255,255,.10)] transition-all hover:-translate-y-px"
            >
              <span className="size-1.5 rounded-full bg-[var(--lp-accent)]" aria-hidden />
              Get started
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="m-0 mb-4 font-sans text-[11px] font-[600] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                {col.heading}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-ink)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-[var(--lp-border-soft)] pt-5 font-mono text-[11.5px] text-[var(--lp-faint)]">
          <span>© 2026 Avorlio</span>
        </div>
      </div>
    </footer>
  );
}
