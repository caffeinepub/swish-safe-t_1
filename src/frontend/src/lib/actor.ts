// Standalone actor helper for use outside React components
// IMPORTANT: We do NOT cache the actor long-term.
// ICP's HttpAgent embeds ingress_expiry in every request based on
// the time the agent was created. If the same agent is reused after
// ~5 minutes, all requests will be rejected with an ingress_expiry error.
// Solution: create a fresh actor for every top-level operation cycle.
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import type { _SERVICE } from "../declarations/backend.did";
import { idlFactory } from "../declarations/backend.did.js";

// Time-limited cache: reuse the actor only within a short window
const ACTOR_TTL_MS = 4 * 60 * 1000; // 4 minutes (well within ICP 5-min expiry)
let _actorInstance: _SERVICE | null = null;
let _actorCreatedAt = 0;
let _actorCreating: Promise<_SERVICE> | null = null;

export async function getActor(): Promise<_SERVICE> {
  const now = Date.now();

  // If we have a fresh actor (created less than 4 minutes ago), reuse it
  if (_actorInstance && now - _actorCreatedAt < ACTOR_TTL_MS) {
    return _actorInstance;
  }

  // Expire stale actor
  if (_actorInstance && now - _actorCreatedAt >= ACTOR_TTL_MS) {
    _actorInstance = null;
    _actorCreating = null;
  }

  // Prevent concurrent creation races
  if (_actorCreating) return _actorCreating;

  _actorCreating = (async () => {
    try {
      const config = await loadConfig();
      const agent = new HttpAgent({ host: config.backend_host });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch((err) => {
          console.warn("Unable to fetch root key:", err);
        });
      }
      const instance = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: config.backend_canister_id,
      });
      _actorInstance = instance;
      _actorCreatedAt = Date.now();
      _actorCreating = null;
      return instance;
    } catch (e) {
      // Don't cache failure — allow retry on next call
      _actorCreating = null;
      _actorInstance = null;
      console.warn("[actor] Failed to create actor:", e);
      throw e;
    }
  })();

  return _actorCreating;
}

// Force-reset actor instance (called on sync error so next call gets a fresh agent)
export function resetActor(): void {
  _actorInstance = null;
  _actorCreatedAt = 0;
  _actorCreating = null;
}
