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
 * How often to re-read balances while connected.
 *
 * Short enough that a mint appears without anyone thinking to press anything,
 * long enough that it is not asking the wallet to do work every second. Wallet
 * sync itself takes far longer than this, so polling faster would only produce
 * the same answer sooner.
 */
const BALANCE_POLL_MS = 15_000;

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

  /**
   * Re-reads balances while connected, because the connector pushes nothing.
   *
   * Everything here is a snapshot taken when the wallet answered, and a coin
   * that arrives afterwards — a mint landing, a payment clearing — is invisible
   * to this page until someone asks again. Without this the balance silently
   * disagrees with the wallet sitting open next to it, which reads as the app
   * being wrong rather than merely behind.
   *
   * Also on focus and on becoming visible: a wallet is usually synced in another
   * window, so coming back to this tab is the exact moment the figure is most
   * likely stale and most likely being looked at.
   */
  useEffect(() => {
    if (!api) return;

    let cancelled = false;
    let inFlight = false;

    const read = async () => {
      // Overlapping reads would let a slow one land after a fast one and undo
      // it; a hidden tab is not worth waking the wallet for.
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const next = await readAccount(api);
        if (!cancelled) setAccount(next);
      } catch {
        // Deliberately silent. A background poll that fails says nothing the
        // user can act on, and an error banner appearing on its own — while the
        // page still works — is worse than a figure that updates a tick late.
        // A real outage surfaces the moment they press Refresh or submit.
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(read, BALANCE_POLL_MS);
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", read);
    };
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
