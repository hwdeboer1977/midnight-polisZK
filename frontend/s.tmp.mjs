import "dotenv/config";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { ledger } from "./contracts/managed/payroll/contract/index.js";
const A="6f0ebb42020eba3a83caf6b4b33e1973285df2ab3f868275453d1137e616b2c1";
const p=indexerPublicDataProvider("https://indexer.preview.midnight.network/api/v4/graphql","wss://indexer.preview.midnight.network/api/v4/graphql/ws");
const l=ledger((await p.queryContractState(A)).data);
console.log("periods:", String(l.periods.size()), "| latest:", String(l.latestPeriod));
process.exit(0);
