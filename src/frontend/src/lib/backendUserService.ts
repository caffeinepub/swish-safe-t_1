import type { AppUser } from "../types";
// Real backend user service for ICP Motoko canister
import { getActor } from "./actor";
import { fromBackendUser, toBackendUser } from "./backendAdapter";
import { USERS_KEY, getList, saveList } from "./dataStore";

export async function pullUsersFromBackend(): Promise<void> {
  try {
    const actor = await getActor();
    const backendUsers = await actor.getUsers();
    const remoteUsers = backendUsers.map(fromBackendUser);

    // Merge: last-write-wins by updatedAt
    const localUsers = getList<AppUser>(USERS_KEY);
    const localMap = new Map(localUsers.map((u) => [u.id, u]));
    for (const remote of remoteUsers) {
      const local = localMap.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) {
        localMap.set(remote.id, remote);
      }
    }
    saveList(USERS_KEY, Array.from(localMap.values()));
  } catch (e) {
    console.warn("[BackendUserService] pullUsersFromBackend failed:", e);
    throw e;
  }
}

export async function pushUserToBackend(user: AppUser): Promise<void> {
  try {
    const actor = await getActor();
    await actor.upsertUser(toBackendUser(user));
  } catch (e) {
    console.warn("[BackendUserService] pushUserToBackend failed:", e);
  }
}

export async function deleteUserFromBackend(id: string): Promise<void> {
  try {
    const actor = await getActor();
    await actor.deleteUser(id);
  } catch (e) {
    console.warn("[BackendUserService] deleteUserFromBackend failed:", e);
  }
}
