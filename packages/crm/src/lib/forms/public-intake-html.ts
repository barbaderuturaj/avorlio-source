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

/**
 * Stored formbricks-stack-v1 intake HTML is pre-rendered, so the public
 * route resolves the generic HVAC completion CTA at serve time.
 */
export function rewriteStoredIntakeCompletionBookCta(
  html: string,
  canonicalBookingUrl: string | null,
): string {
  return html.replace(COMPLETION_BOOK_CTA_RE, (anchor) => {
    if (!canonicalBookingUrl) return "";
    return anchor.replace(
      /\bhref=(["'])\/book\1/,
      `href="${escapeAttr(canonicalBookingUrl)}"`,
    );
  });
}
