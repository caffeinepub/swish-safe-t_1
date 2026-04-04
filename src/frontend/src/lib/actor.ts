// Standalone actor helper for use outside React components
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import type { _SERVICE } from "../declarations/backend.did";
import { idlFactory } from "../declarations/backend.did.js";

let actorInstance: _SERVICE | null = null;
let actorCreating: Promise<_SERVICE> | null = null;

export async function getActor(): Promise<_SERVICE> {
  if (actorInstance) return actorInstance;

  // Prevent concurrent creation races
  if (actorCreating) return actorCreating;

  actorCreating = (async () => {
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
      actorInstance = instance;
      actorCreating = null;
      return instance;
    } catch (e) {
      // Don't cache failure — allow retry on next call
      actorCreating = null;
      console.warn("[actor] Failed to create actor:", e);
      throw e;
    }
  })();

  return actorCreating;
}

// Reset actor instance (e.g. after config changes or on sync error)
export function resetActor(): void {
  actorInstance = null;
  actorCreating = null;
}
