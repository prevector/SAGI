import { useEffect, useState } from "react";
import type { NetworkStatsDTO, TxDTO } from "@sagi/ledger";
import { api } from "../../lib/api";

export interface LedgerData {
  stats: NetworkStatsDTO | null;
  txs: TxDTO[];
  loading: boolean;
  error: Error | null;
}

/**
 * Explorer feed: ledger stats + recent transactions, polled on an interval.
 * (Stats also stream live via subscribeNetwork as display numbers; the explorer
 * polls for the exact base-unit strings.) Cleans up the timer on unmount.
 */
export function useLedger(pollMs = 4000): LedgerData {
  const [stats, setStats] = useState<NetworkStatsDTO | null>(null);
  const [txs, setTxs] = useState<TxDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [s, t] = await Promise.all([api.getLedgerStats(), api.getRecentTx(30)]);
        if (!active) return;
        setStats(s);
        setTxs(t);
        setLoading(false);
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    };
    void load();
    const id = setInterval(load, pollMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return { stats, txs, loading, error };
}
