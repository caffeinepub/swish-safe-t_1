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

type SyncStatusListener = (status: SyncStatus) => void;

let _syncStatus: SyncStatus = navigator.onLine ? "idle" : "offline";
const _listeners: Set<SyncStatusListener> = new Set();

export function getSyncStatus(): SyncStatus {
  return _syncStatus;
}

export function setSyncStatus(status: SyncStatus): void {
  _syncStatus = status;
  for (const listener of _listeners) {
    listener(status);
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
// Guard flag: is a retry-triggered pull already in-flight?
let _retryInFlight = false;

function scheduleRetry(): void {
  // Never schedule if a retry is already pending or in-flight
  if (_retryTimer !== null || _retryInFlight) return;
  if (!navigator.onLine) return;

  const delay = Math.min(
    BASE_RETRY_DELAY_MS * 2 ** _retryCount,
    MAX_RETRY_DELAY_MS,
  );
  _retryCount = Math.min(_retryCount + 1, 6); // cap exponent at 6 (max ~64s)
  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    if (!navigator.onLine) return;
    if (_retryInFlight) return;
    _retryInFlight = true;
    // Reset actor so a fresh connection is attempted
    resetActor();
    pullAllFromBackend()
      .then(() => {
        _retryInFlight = false;
        _retryCount = 0;
        return flushSyncQueue();
      })
      .catch(() => {
        _retryInFlight = false;
        // pullAllFromBackend already scheduled its own retry via its catch block,
        // so we don't double-schedule here.
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
  data: string; // JSON stringified object OR id string for deletes
  timestamp: number;
}

export function enqueueSyncOp(op: SyncOp): void {
  try {
    const queue = getQueue();
    // Replace previous op for same entity+id
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
        console.warn("[BackendSync] Failed to flush op:", op, e);
        failed.push(op);
      }
    }
    // Keep only failed ops in the queue
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
    console.warn("[BackendSync] Failed to flush queue:", e);
    // Reset actor so next attempt creates a fresh connection
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
    // Give the network a moment to stabilise before syncing
    setTimeout(() => {
      resetActor();
      pullAllFromBackend()
        .then(() => flushSyncQueue())
        .catch((e) =>
          console.warn("[BackendSync] Auto-flush on online failed:", e),
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

// ===== Pull all =====
export async function pullAllFromBackend(): Promise<void> {
  // If a pull is already in-flight, wait for it instead of starting a second one
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
    console.warn("[BackendSync] pullAllFromBackend failed:", e);
    // Reset actor so next attempt creates a fresh connection
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
    // Last-write-wins: use whichever has newer updatedAt
    if (!local || remote.updatedAt > local.updatedAt) {
      localMap.set(remote.id, remote);
    }
  }

  saveList(key, Array.from(localMap.values()));
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
    console.warn("[BackendSync] push failed, queuing:", e);
    // Reset actor so next attempt gets a fresh connection
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
