import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Account {
  unshieldedAddress: string;
  shieldedAddress: string;
  dustAddress: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
  night: bigint;
  dust: { balance: bigint; cap: bigint };
  shieldedBalances: Record<string, bigint>;
}

interface WalletState {
  networkId: string;
  setNetworkId: (id: string) => void;
  available: { key: string; api: InitialAPI }[];
  wallet: InitialAPI | null;
  api: ConnectedAPI | null;
  account: Account | null;
  connecting: boolean;
  error: string | null;
  connect: (api: InitialAPI) => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

/**
 * Wallets inject one or more InitialAPI objects under `window.midnight`, keyed
 * by an arbitrary id, so the only correct way to find them is to enumerate it.
 */
function installedWallets(): { key: string; api: InitialAPI }[] {
  return Object.entries(window.midnight ?? {})
    .filter(([, api]) => api && typeof api.connect === "function")
    .map(([key, api]) => ({ key, api }));
}

async function readAccount(api: ConnectedAPI): Promise<Account> {
  const [shielded, unshielded, dust, unshieldedBalances, shieldedBalances, dustBalance] =
    await Promise.all([
      api.getShieldedAddresses(),
      api.getUnshieldedAddress(),
      api.getDustAddress(),
      api.getUnshieldedBalances(),
      api.getShieldedBalances(),
      api.getDustBalance(),
    ]);

  return {
    unshieldedAddress: unshielded.unshieldedAddress,
    shieldedAddress: shielded.shieldedAddress,
    dustAddress: dust.dustAddress,
    coinPublicKey: shielded.shieldedCoinPublicKey,
    encryptionPublicKey: shielded.shieldedEncryptionPublicKey,
    night: Object.values(unshieldedBalances)[0] ?? 0n,
    dust: { balance: dustBalance.balance, cap: dustBalance.cap },
    shieldedBalances,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [networkId, setNetworkId] = useState("preview");
  const [available, setAvailable] = useState(installedWallets);
  const [wallet, setWallet] = useState<InitialAPI | null>(null);
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An extension may inject after React mounts, so a single read would report
  // "no wallet" for one that is merely slow. Poll briefly, then stop.
  useEffect(() => {
    if (available.length > 0) return;
    let attempts = 0;
    const poll = window.setInterval(() => {
      const found = installedWallets();
      attempts += 1;
      if (found.length > 0 || attempts > 10) {
        window.clearInterval(poll);
        setAvailable(found);
      }
    }, 500);
    return () => window.clearInterval(poll);
  }, [available.length]);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setAccount(await readAccount(api));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [api]);

  const connect = useCallback(
    async (candidate: InitialAPI) => {
      setConnecting(true);
      setError(null);
      try {
        const connected = await candidate.connect(networkId);
        setApi(connected);
        setWallet(candidate);
        setAccount(await readAccount(connected));
      } catch (cause) {
        // A rejected connection is a normal outcome, not a crash.
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setConnecting(false);
      }
    },
    [networkId]
  );

  const disconnect = useCallback(() => {
    // The connector API has no revoke method; dropping the handle is all a page
    // can do. The wallet keeps its own permission and manages it in its own UI.
    setApi(null);
    setWallet(null);
    setAccount(null);
  }, []);

  // Balances and even addresses are network-scoped, so a stale connection must
  // not keep showing figures from the network the user just switched away from.
  useEffect(() => {
    disconnect();
  }, [networkId, disconnect]);

  const value = useMemo<WalletState>(
    () => ({
      networkId,
      setNetworkId,
      available,
      wallet,
      api,
      account,
      connecting,
      error,
      connect,
      disconnect,
      refresh,
    }),
    [networkId, available, wallet, api, account, connecting, error, connect, disconnect, refresh]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <WalletProvider>");
  return context;
}
