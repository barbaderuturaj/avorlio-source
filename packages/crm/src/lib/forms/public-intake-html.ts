function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COMPLETION_BOOK_CTA_RE =
  /<a\b(?=[^>]*\bclass=(["'])[^"']*\bsf-intake__complete-cta\b[^"']*\1)(?=[^>]*\bhref=(["'])\/book\2)[^>]*>[\s\S]*?<\/a>/;

const COMPLETION_ANY_CTA_RE =
  /<a\b(?=[^>]*\bclass=(["'])[^"']*\bsf-intake__complete-cta\b[^"']*\1)[^>]*>/;

const COMPLETION_RESTART_RE =
  /<button\b(?=[^>]*\bclass=(["'])[^"']*\bsf-intake__complete-restart\b[^"']*\1)[^>]*>/;

/**
 * Stored formbricks-stack-v1 intake HTML is pre-rendered, so the public
 * route resolves the generic HVAC completion CTA at serve time.
 */
const POWERED_BY_SELDONFRAME_RE =
  /<p\b(?=[^>]*\bclass=(["'])[^"']*\bsf-footer__poweredby\b[^"']*\1)[^>]*>[\s\S]*?<\/p>/gi;

export function rewriteStoredIntakeCompletionBookCta(
  html: string,
  canonicalBookingUrl: string | null,
  injectWhenMissing = false,
): string {
  html = html.replace(POWERED_BY_SELDONFRAME_RE, "");
  const rewritten = html.replace(COMPLETION_BOOK_CTA_RE, (anchor) => {
    if (!canonicalBookingUrl) return "";
    return anchor.replace(
      /\bhref=(["'])\/book\1/,
      `href="${escapeAttr(canonicalBookingUrl)}"`,
    );
  });

  if (
    !canonicalBookingUrl ||
    !injectWhenMissing ||
    COMPLETION_ANY_CTA_RE.test(rewritten)
  ) {
    return rewritten;
  }

  const bookingCta =
    `<a class="sf-btn sf-btn--primary sf-intake__complete-cta" href="${escapeAttr(canonicalBookingUrl)}">` +
    `<span class="sf-btn__label">Book appointment</span>` +
    `<span class="sf-btn__icon" aria-hidden="true">→</span>` +
    `</a>`;

  return rewritten.replace(
    COMPLETION_RESTART_RE,
    `${bookingCta}\n    $&`,
  );
}
