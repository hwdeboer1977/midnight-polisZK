# Why the server builds from its own tsconfig

`npm run build` compiles all of `src/`, which includes the operator CLIs —
`fund-cli`, `relay`, `terminate-cli`, `payee-cli` — and those import
`../contracts/managed/<name>/contract/index.js` **statically**, at the top of
the file.

`contracts/managed/` is gitignored. It is a build product of the Compact
compiler, and a deploy target has neither the directory nor the compiler, so
those imports cannot resolve there and `tsc` fails the whole build:

    src/relay.ts(8,34): error TS2307: Cannot find module
      '../contracts/managed/payroll/contract/index.js'

That is the correct answer for those files. They genuinely require compiled
contracts and genuinely cannot run without them — a relay with no `payroll`
module has nothing to build a tree from. The mistake would be making them
compile anyway and fail at run time instead.

`tsconfig.server.json` includes only `src/server/**`, and `tsc` follows imports
from there — so the server and its actual dependency closure get compiled and
nothing else does. The CLIs are excluded because a deploy target does not run
them, not because they are broken.

    npm run build         everything — what a developer wants locally
    npm run build:server  the server's closure — what a deploy target wants

If a server route ever needs `claim-tree` or `fund-pool` (both currently
relay-only, both reaching for `contracts/managed`), this stops working and the
fix is to make those two resolve their contract module the way
`utils/contract.ts` already does: at run time, falling back to the copies
committed under `frontend/`.

# Run-time state and DATA_DIR

Three files outlive a single request and none of them is source:

    deployment.json          what has been deployed, and where
    .onboarded-keys.json     which employer keys have already signed up
    .wallet-state/           the wallet's sync position

All three default to `process.cwd()`. On a developer's machine that is the repo
and it is durable. On a managed host it is the code directory, which is replaced
on every deploy — so the default silently loses all three each time you push.

For the sync position that costs a full chain replay on next boot: slow, and
recoverable. For `deployment.json` it is worse than slow. Onboarding deploys a
payroll contract and assigns it to an employer's key; `assignEmployer` can only
be called once, so the binding is permanent. Lose the address and the contract
is still out there, still theirs, and unreachable by anything that needed to
know where it was.

`DATA_DIR` points all three at storage that survives a deploy:

    DATA_DIR=/var/data     with a disk mounted there

Unset, everything resolves exactly as it always did — `deployment.json` in the
repo root, next to the deploy scripts that write it.

`frontend/public/deployments.json` is deliberately NOT moved. It is committed
source, it ships with the code, and it is the baseline `deployments.ts` merges
under whatever the live file holds.
