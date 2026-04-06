import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type SyncStatus,
  getLastSyncedAt,
  getSyncStatus,
  manualSync,
  subscribeSyncStatus,
} from "../lib/backendSync";

interface SyncButtonProps {
  className?: string;
}

export function SyncButton({ className }: SyncButtonProps) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [lastSynced, setLastSynced] = useState<number | null>(
    getLastSyncedAt(),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = subscribeSyncStatus((s, ts) => {
      setStatus(s);
      if (ts) setLastSynced(ts);
    });
    return unsub;
  }, []);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await manualSync();
      // Force a page re-render by reloading data via storage event
      window.dispatchEvent(new Event("swish-sync"));
    } catch {
      // Error is handled inside manualSync
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const isSpinning = isSyncing || status === "syncing";

  const formatTime = (ts: number | null) => {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className={`flex flex-col items-end gap-0.5 ${className ?? ""}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSpinning}
        className="flex items-center gap-1.5 h-8 text-xs font-medium border-border"
        title="Sync with server"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`}
          style={{ color: "#96BB1A" }}
        />
        {isSpinning ? "Syncing…" : status === "error" ? "Retry Sync" : "Sync"}
      </Button>
      {lastSynced && !isSpinning && (
        <span className="text-[10px] text-muted-foreground">
          Last synced {formatTime(lastSynced)}
        </span>
      )}
    </div>
  );
}
