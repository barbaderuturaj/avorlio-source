// packages/crm/src/app/(public)/unified-landing.tsx
//
// ONE composition, two modes (spec §2). `/` renders it with the mode
// resolved from ?mode=; /record renders it pre-flipped. Section stacks
// are server-rendered and handed to the client shell as children.

// NOTE: landing-theme.css is imported by each route (page.tsx,
// record/page.tsx) — see the header note in landing-mode.tsx.

import type { LandingMode } from "./landing-mode";
import { LandingModeShell } from "@/components/landing/landing-mode";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingHero } from "@/components/landing/marketing-hero";
import { MarketingProofStrip } from "@/components/landing/marketing-proof-strip";
import { MarketingBuildSteps } from "@/components/landing/marketing-build-steps";
import { MarketingAgentOrbit } from "@/components/landing/marketing-agent-orbit";
import { MarketingModules } from "@/components/landing/marketing-modules";
import { LandingMarketingFaqSection } from "@/components/landing/marketing-faq-section";
import { MarketingFinalCta } from "@/components/landing/marketing-final-cta";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { RecordHero } from "@/components/landing/record/record-hero";
import { RecordSteps } from "@/components/landing/record/record-steps";
import { RecordWhatYouGet } from "@/components/landing/record/record-what-you-get";
import { RecordProof } from "@/components/landing/record/record-proof";
import { RecordFaq } from "@/components/landing/record/record-faq";

export type RecordSurfaceProps = {
  claimedSessionId: string | null;
  claimed: boolean;
  isAuthed: boolean;
  sharedFlag?: "1" | "miss" | null;
  /** SF_DRAFT_APPROVALS (never-fail-compile) — recap-panel is a client
   *  component, so the flag must arrive as a prop from this server
   *  boundary (L-18). Absent/false → today's recap output, unchanged. */
  draftApprovals?: boolean;
};

export function UnifiedLanding({
  initialMode,
  recordEnabled,
  urlStrategy,
  tierLadderOn: _tierLadderOn,
  ungatedBuildEnabled,
  recordProps,
  recordFaqWithSchema = false,
}: {
  initialMode: LandingMode;
  recordEnabled: boolean;
  urlStrategy: "replace-state" | "navigate-home";
  tierLadderOn?: boolean;
  ungatedBuildEnabled: boolean;
  recordProps: RecordSurfaceProps;
  /** true only on /record — FAQPage JSON-LD must not duplicate on / */
  recordFaqWithSchema?: boolean;
}) {
  return (
    <LandingModeShell
      initialMode={initialMode}
      recordEnabled={recordEnabled}
      urlStrategy={urlStrategy}
      nav={<MarketingNav />}
      footer={<MarketingFooter />}
      buildStack={
        <>
          <MarketingHero ungatedBuildEnabled={ungatedBuildEnabled} />
          <MarketingAgentOrbit />
          {/* How it works → the payoff ("Either way, you get the whole front
              office") → the agent catalog, kept adjacent so the two-ways idea
              pays off immediately. */}
          <MarketingBuildSteps />
          <MarketingModules />
          <MarketingProofStrip />
          <LandingMarketingFaqSection />
          <MarketingFinalCta />
        </>
      }
      recordStack={
        <>
          <RecordHero {...recordProps} />
          <RecordSteps />
          <RecordWhatYouGet />
          <RecordProof />
          <RecordFaq withSchema={recordFaqWithSchema} />
          <MarketingFinalCta variant="record" />
        </>
      }
    />
  );
}
