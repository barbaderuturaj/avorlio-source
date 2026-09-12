import Link from "next/link";

type FaqItem = { question: string; answer: string };

const FAQS: readonly FaqItem[] = [
  {
    question: "What does Avorlio do?",
    answer:
      "Avorlio is an AI front office for service businesses. It captures leads, answers questions, qualifies prospects, books appointments, and follows up automatically.",
  },
  {
    question: "Who is Avorlio for?",
    answer:
      "Avorlio is built for service businesses that need a reliable way to respond to new inquiries and keep appointments moving. The initial launch focus is HVAC.",
  },
  {
    question: "What happens when I get started?",
    answer:
      "Share your website or describe your business, including services, hours, and booking rules. Avorlio uses that context to shape an AI front office around how your business actually operates.",
  },
  {
    question: "Can it handle more than lead capture?",
    answer:
      "Yes. The launch experience is designed to answer common questions, qualify prospects, book appointments, and follow up so new leads do not disappear between the first inquiry and the next step.",
  },
  {
    question: "Is Avorlio only for HVAC businesses?",
    answer:
      "HVAC is the primary launch niche. The product is being shaped for broader service businesses over time, with the same front-office workflow at the center.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export function LandingMarketingFaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-[rgba(34,29,23,.08)] px-5 py-20 md:px-8 md:py-28 lg:px-12"
    >
      <div className="mx-auto max-w-[760px]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-2.5 text-[12px] font-[600] uppercase tracking-[0.09em] text-[#1F2B24]">
            <span className="h-px w-4 bg-[#1F2B24] opacity-50" aria-hidden />
            FAQ
            <span className="h-px w-4 bg-[#1F2B24] opacity-50" aria-hidden />
          </div>
          <h2
            id="faq-heading"
            className="mt-3.5 text-[clamp(27px,4.2vw,42px)] font-[500] leading-[1.08] tracking-[-0.025em] text-[#221D17]"
          >
            Honest answers.
          </h2>
        </div>

        <div className="mt-10 border-t border-[rgba(34,29,23,.10)]">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group border-b border-[rgba(34,29,23,.10)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-[500] leading-tight tracking-[-0.01em] text-[#221D17] [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span
                  aria-hidden
                  className="relative flex size-[22px] shrink-0 transition-transform duration-[300ms] group-open:rotate-[135deg]"
                >
                  <span className="absolute left-1/2 top-[3px] bottom-[3px] w-[2px] -translate-x-1/2 rounded-sm bg-[#1F2B24]" />
                  <span className="absolute top-1/2 left-[3px] right-[3px] h-[2px] -translate-y-1/2 rounded-sm bg-[#1F2B24]" />
                </span>
              </summary>
              <p className="max-w-[66ch] pb-6 pr-10 text-[15px] leading-[1.62] text-[#6E665A]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] leading-[1.55] text-[#6E665A]">
            Ready to stop losing good inquiries?
          </p>
          <Link
            href="/#hero-form"
            className="inline-flex items-center gap-2 rounded-[11px] bg-[#1F2B24] px-5 py-3 text-[14px] font-[600] text-[#F6F2EA] transition-transform hover:-translate-y-px"
          >
            Start with Avorlio
          </Link>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </section>
  );
}
