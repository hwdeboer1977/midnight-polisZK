// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Shown when nothing is detected. An empty state that only says "not found" is a
 * dead end for someone who has never installed a browser extension, which is
 * most of the people this flow is for.
 *
 * Links point at each vendor's own site as well as the store listing, so the
 * store URL can be checked against the vendor before installing anything.
 */
export const WALLET_OPTIONS = [
  {
    name: "1AM",
    note: "Built for Midnight. Chrome and Firefox.",
    site: "https://1am.xyz/",
    store: "https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp",
  },
  {
    name: "Lace",
    note: "By Input Output, who build Midnight and Cardano.",
    site: "https://www.lace.io/",
    store: "https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk",
    // Detected and refused at the connect button too, in `wallet/support.ts`.
    // Offering an install that leads to a wallet this build cannot finish a run
    // with is the same mistake made earlier: it costs someone an extension and
    // a failed filing to discover.
    soon: "Lace cannot prove these circuits in the browser — support is not ready yet.",
  },
];

export function InstallHelp({ subject }: { subject: string }) {
  return (
    <div className="install">
      <p className="install-lead">
        No {subject} app found in this browser. You need one before you can register —
        it creates and holds your keys, and nothing else can create them for you.
      </p>

      {WALLET_OPTIONS.map((option) => (
        <div
          className={option.soon ? "install-option soon" : "install-option"}
          key={option.name}
        >
          <div className="meta">
            <div className="name">{option.name}</div>
            <div className="muted">{option.soon ?? option.note}</div>
          </div>
          {option.soon ? (
            <span className="button disabled" aria-disabled="true">
              Coming soon
            </span>
          ) : (
            <a className="button" href={option.store} target="_blank" rel="noreferrer noopener">
              Install
            </a>
          )}
          <a className="button secondary" href={option.site} target="_blank" rel="noreferrer noopener">
            Website
          </a>
        </div>
      ))}

      <p className="note">
        Install one, create a key, then reload this page. Write down the recovery
        phrase it gives you and keep it offline — it is the only way back into your
        account, and nobody can reset it for you.
      </p>
    </div>
  );
}

/**
 * A quieter version for when something *is* detected. Someone can still have the
 * wrong app installed, or want a different one, and hiding the links entirely
 * once any extension is found leaves them with nowhere to go.
 */
export function InstallLinks({ subject }: { subject: string }) {
  return (
    <p className="note install-links">
      {/* Only the ones a run can actually finish with. This line offered Lace
          as an equal option, which is where someone would have picked it. */}
      Do not have a {subject} yet?{" "}
      {WALLET_OPTIONS.filter((option) => !option.soon).map((option, index) => (
        <span key={option.name}>
          {index > 0 ? " or " : ""}
          <a href={option.store} target="_blank" rel="noreferrer noopener">
            install {option.name}
          </a>
        </span>
      ))}
      . Reload this page afterwards.
    </p>
  );
}
