import type { Audit, Client, Site, Template } from "../types";
// Real backend sync implementation for ICP Motoko canister
import { getActor, resetActor } from "./actor";
import {
  fromBackendAudit,
  fromBackendClient,
  fromBackendSite,
  fromBackendTemplate,
  toBackendAudit,
  toBackendClient,
  toBackendSite,
  toBackendTemplate,
} from "./backendAdapter";
import {
  AUDITS_KEY,
  CLIENTS_KEY,
  SITES_KEY,
  TEMPLATES_KEY,
  getList,
  saveList,
} from "./dataStore";

// ===== Sync status =====
export type SyncStatus = "idle" | "syncing" | "error" | "offline";

type SyncStatusListener = (status: SyncStatus, lastSyncedAt?: number) => void;

let _syncStatus: SyncStatus = navigator.onLine ? "idle" : "offline";
let _lastSyncedAt: number | null = null;
const _listeners: Set<SyncStatusListener> = new Set();

export function getSyncStatus(): SyncStatus {
  return _syncStatus;
}

export function getLastSyncedAt(): number | null {
  return _lastSyncedAt;
}

export function setSyncStatus(status: SyncStatus): void {
  _syncStatus = status;
  if (status === "idle") {
    _lastSyncedAt = Date.now();
  }
  for (const listener of _listeners) {
    listener(status, _lastSyncedAt ?? undefined);
  }
}

export function subscribeSyncStatus(fn: SyncStatusListener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ===== Retry / backoff =====
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RETRY_DELAY_MS = 60_000;
const BASE_RETRY_DELAY_MS = 5_000;
let _retryCount = 0;
let _retryInFlight = false;

function scheduleRetry(): void {
  if (_retryTimer !== null || _retryInFlight) return;
  if (!navigator.onLine) return;

  const delay = Math.min(
    BASE_RETRY_DELAY_MS * 2 ** _retryCount,
    MAX_RETRY_DELAY_MS,
  );
  _retryCount = Math.min(_retryCount + 1, 6);
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    if (!navigator.onLine) return;
    if (_retryInFlight) return;
    _retryInFlight = true;
    resetActor();
    pullAllFromBackend()
      .then(() => {
        _retryInFlight = false;
        _retryCount = 0;
        return flushSyncQueue();
      })
      .catch(() => {
        _retryInFlight = false;
      });
  }, delay);
}

function clearRetry(): void {
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  _retryInFlight = false;
}

// ===== Offline queue =====
const QUEUE_KEY = "swish_sync_queue";

export interface SyncOp {
  op: "upsert" | "delete";
  entity: "client" | "site" | "template" | "audit";
  data: string;
  timestamp: number;
}

export function enqueueSyncOp(op: SyncOp): void {
  try {
    const queue = getQueue();
    const dataId = op.op === "delete" ? op.data : JSON.parse(op.data)?.id;
    const filtered = queue.filter((item) => {
      const itemId =
        item.op === "delete" ? item.data : JSON.parse(item.data)?.id;
      return !(item.entity === op.entity && itemId === dataId);
    });
    filtered.push(op);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("[BackendSync] Failed to enqueue op:", e);
  }
}

export function getPendingIds(entity: SyncOp["entity"]): Set<string> {
  const queue = getQueue();
  const ids = new Set<string>();
  for (const op of queue) {
    if (op.entity === entity && op.op === "upsert") {
      try {
        const parsed = JSON.parse(op.data);
        if (parsed?.id) ids.add(parsed.id);
      } catch {
        /* ignore */
      }
    }
  }
  return ids;
}

function getQueue(): SyncOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncOp[];
  } catch {
    return [];
  }
}

function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function flushSyncQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  setSyncStatus("syncing");
  try {
    const actor = await getActor();
    const failed: SyncOp[] = [];
    for (const op of queue) {
      try {
        if (op.op === "delete") {
          if (op.entity === "client") await actor.deleteClient(op.data);
          else if (op.entity === "site") await actor.deleteSite(op.data);
          else if (op.entity === "template")
            await actor.deleteTemplate(op.data);
          else if (op.entity === "audit") await actor.deleteAudit(op.data);
        } else {
          const parsed = JSON.parse(op.data);
          if (op.entity === "client")
            await actor.upsertClient(toBackendClient(parsed));
          else if (op.entity === "site")
            await actor.upsertSite(toBackendSite(parsed));
          else if (op.entity === "template")
            await actor.upsertTemplate(toBackendTemplate(parsed));
          else if (op.entity === "audit")
            await actor.upsertAudit(toBackendAudit(parsed));
        }
      } catch (e) {
        const msg = extractErrorMessage(e);
        console.warn(
          `[BackendSync] Failed to flush op entity=${op.entity} op=${op.op}: ${msg}`,
          e,
        );
        failed.push(op);
      }
    }
    if (failed.length === 0) {
      clearQueue();
      setSyncStatus("idle");
      _retryCount = 0;
    } else {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
      setSyncStatus("error");
      scheduleRetry();
    }
  } catch (e) {
    const msg = extractErrorMessage(e);
    console.warn(`[BackendSync] Failed to get actor for flush: ${msg}`, e);
    resetActor();
    setSyncStatus("error");
    scheduleRetry();
  }
}

export function setupOnlineListener(): void {
  window.addEventListener("online", () => {
    clearRetry();
    _retryCount = 0;
    setSyncStatus("idle");
    setTimeout(() => {
      resetActor();
      pullAllFromBackend()
        .then(() => flushSyncQueue())
        .catch((e) =>
          console.warn(
            "[BackendSync] Auto-flush on online failed:",
            extractErrorMessage(e),
          ),
        );
    }, 1000);
  });
  window.addEventListener("offline", () => {
    clearRetry();
    setSyncStatus("offline");
  });
}

// Guard to prevent concurrent pullAllFromBackend calls
let _pullInFlight: Promise<void> | null = null;

export async function pullAllFromBackend(): Promise<void> {
  if (_pullInFlight) return _pullInFlight;
  _pullInFlight = _doPull();
  try {
    await _pullInFlight;
  } finally {
    _pullInFlight = null;
  }
}

async function _doPull(): Promise<void> {
  setSyncStatus("syncing");
  try {
    const actor = await getActor();
    const [backendClients, backendSites, backendTemplates, backendAudits] =
      await Promise.all([
        actor.getClients(),
        actor.getSites(),
        actor.getTemplates(),
        actor.getAudits(),
      ]);

    mergeIntoLocal<Client>(CLIENTS_KEY, backendClients.map(fromBackendClient));
    mergeIntoLocal<Site>(SITES_KEY, backendSites.map(fromBackendSite));
    mergeIntoLocal<Template>(
      TEMPLATES_KEY,
      backendTemplates.map(fromBackendTemplate),
    );
    mergeIntoLocal<Audit>(AUDITS_KEY, backendAudits.map(fromBackendAudit));

    setSyncStatus("idle");
    _retryCount = 0;
    clearRetry();
  } catch (e) {
    const msg = extractErrorMessage(e);
    console.warn(`[BackendSync] pullAllFromBackend failed: ${msg}`, e);
    resetActor();
    setSyncStatus(navigator.onLine ? "error" : "offline");
    if (navigator.onLine) scheduleRetry();
    throw e;
  }
}

function mergeIntoLocal<T extends { id: string; updatedAt: number }>(
  key: string,
  remoteItems: T[],
): void {
  const localItems = getList<T>(key);
  const localMap = new Map(localItems.map((i) => [i.id, i]));
  for (const remote of remoteItems) {
    const local = localMap.get(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      localMap.set(remote.id, remote);
    }
  }
  saveList(key, Array.from(localMap.values()));
}

// ===== Manual sync (push then pull) =====
export async function manualSync(): Promise<void> {
  clearRetry();
  resetActor();
  await flushSyncQueue();
  await pullAllFromBackend();
}

// ===== Per-entity push/delete =====
async function withRetryQueue<T>(
  fn: () => Promise<T>,
  fallback: () => void,
): Promise<void> {
  setSyncStatus("syncing");
  try {
    await fn();
    setSyncStatus("idle");
  } catch (e) {
    const msg = extractErrorMessage(e);
    console.warn(`[BackendSync] push failed, queuing: ${msg}`, e);
    resetActor();
    fallback();
    setSyncStatus(navigator.onLine ? "error" : "offline");
    if (navigator.onLine) scheduleRetry();
  }
}

export async function pushClientToBackend(client: Client): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.upsertClient(toBackendClient(client));
    },
    () =>
      enqueueSyncOp({
        op: "upsert",
        entity: "client",
        data: JSON.stringify(client),
        timestamp: Date.now(),
      }),
  );
}

export async function deleteClientFromBackend(id: string): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.deleteClient(id);
    },
    () =>
      enqueueSyncOp({
        op: "delete",
        entity: "client",
        data: id,
        timestamp: Date.now(),
      }),
  );
}

export async function pushSiteToBackend(site: Site): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.upsertSite(toBackendSite(site));
    },
    () =>
      enqueueSyncOp({
        op: "upsert",
        entity: "site",
        data: JSON.stringify(site),
        timestamp: Date.now(),
      }),
  );
}

export async function deleteSiteFromBackend(id: string): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.deleteSite(id);
    },
    () =>
      enqueueSyncOp({
        op: "delete",
        entity: "site",
        data: id,
        timestamp: Date.now(),
      }),
  );
}

export async function pushTemplateToBackend(template: Template): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.upsertTemplate(toBackendTemplate(template));
    },
    () =>
      enqueueSyncOp({
        op: "upsert",
        entity: "template",
        data: JSON.stringify(template),
        timestamp: Date.now(),
      }),
  );
}

export async function deleteTemplateFromBackend(id: string): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.deleteTemplate(id);
    },
    () =>
      enqueueSyncOp({
        op: "delete",
        entity: "template",
        data: id,
        timestamp: Date.now(),
      }),
  );
}

export async function pushAuditToBackend(audit: Audit): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.upsertAudit(toBackendAudit(audit));
    },
    () =>
      enqueueSyncOp({
        op: "upsert",
        entity: "audit",
        data: JSON.stringify(audit),
        timestamp: Date.now(),
      }),
  );
}

export async function deleteAuditFromBackend(id: string): Promise<void> {
  await withRetryQueue(
    async () => {
      const actor = await getActor();
      await actor.deleteAudit(id);
    },
    () =>
      enqueueSyncOp({
        op: "delete",
        entity: "audit",
        data: id,
        timestamp: Date.now(),
      }),
  );
}
