// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The block every page opens with. One structure, everywhere:
 *
 *     title
 *     one-line description
 *     (an optional badge — what this console IS, not what it holds)
 *
 * There were three variants of this before — `net-head` on the public pages,
 * `area-head` on the employer and employee pages, and Operator's own dark
 * block with a 360px role card beside the title. They rendered at slightly
 * different heights and rhythms, which is most of what made nine coherent
 * screens still read as nine separate pages. Two class names for one thing is
 * how that drift starts, so there is now one component and one rule.
 *
 * The status line above it is not part of this: it is a temporary system
 * state, and it belongs to the shell (see `GlobalStatus` in App), not to any
 * page's identity.
 */
export function PageHead({
  title,
  children,
  badge,
  brand,
}: {
  /** The page's name. Short — the description carries the explanation. */
  title: React.ReactNode;
  /** One line. Long enough to say what the page is for, short enough to read. */
  children: React.ReactNode;
  /**
   * A standing fact about the page's role, as a compact inline callout beneath
   * the description. Operator's protocol role used to be a card the height of
   * the header itself, which pushed its first real content a screen down and
   * broke its alignment with every other page.
   */
  badge?: React.ReactNode;
  /** Renders the title as the wordmark. The network pages, and only those. */
  brand?: boolean;
}) {
  return (
    <section className="page-head">
      <h1 className={brand ? "brand-head" : undefined}>{title}</h1>
      <p className="lede">{children}</p>
      {badge ? <div className="page-badge">{badge}</div> : null}
    </section>
  );
}
