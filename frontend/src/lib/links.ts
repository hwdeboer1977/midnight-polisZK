// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The off-site things the product points at: the two papers, the source, the
 * address to write to. Shared because the masthead and the landing page's
 * closing block both offer them, and a paper that moves should move once.
 *
 * An empty string renders nothing rather than a dead link — the rule the demo
 * video already followed. Point the papers at a file dropped in
 * frontend/public/, or at wherever they are hosted.
 */
export const POSITION_PAPER_URL = "/position-paper.pdf";
export const WHITE_PAPER_URL = "/white-paper.pdf";
export const REPO_URL = "https://github.com/hwdeboer1977/midnight-polisZK";
export const CONTACT_EMAIL = "hwdeboer@blockstatsolutions.com";
