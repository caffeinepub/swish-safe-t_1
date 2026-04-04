import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { getActor, resetActor } from "../lib/actor";
import { fromBackendUser } from "../lib/backendAdapter";
import { pullAllFromBackend, setupOnlineListener } from "../lib/backendSync";
import { pullUsersFromBackend } from "../lib/backendUserService";
import {
  ensureAdminSeeded,
  getUserByUsername,
  seedSampleData,
  verifyCredentials,
} from "../lib/dataStore";
import { clearSession, getSession, setSession } from "../lib/session";
import type { AppUser } from "../types";

interface AuthContextType {
  user: AppUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refresh: () => void;
  isAdmin: () => boolean;
  hasRole: (...roles: AppUser["role"][]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    // 1. Seed local admin + sample data (offline fallback — always runs first)
    ensureAdminSeeded();
    seedSampleData();

    // 2. Restore session from local store immediately (before any async work)
    const session = getSession();
    if (session) {
      const fresh = getUserByUsername(session.username);
      if (fresh?.isEnabled) {
        setUser(fresh);
        setSession(fresh);
      } else {
        clearSession();
      }
    }

    // 3. Setup online listener for offline queue auto-flush
    setupOnlineListener();

    // 4. Backend init: bootstrap admin first, then pull all data
    //    We sequence these so bootstrapAdmin completes before the pull.
    //    Errors at any step are handled gracefully — local data remains usable.
    let cancelled = false;

    (async () => {
      try {
        const actor = await getActor();
        await actor.bootstrapAdmin();
      } catch (e) {
        console.warn("[Auth] bootstrapAdmin failed:", e);
        resetActor();
      }

      if (cancelled) return;

      try {
        await pullAllFromBackend();
      } catch {
        // Already handled inside pullAllFromBackend (schedules retry)
        toast("Using offline data", {
          description:
            "Could not reach server. Changes will sync when reconnected.",
          duration: 4000,
        });
      }

      if (cancelled) return;

      try {
        await pullUsersFromBackend();
        // Refresh current user from local store after users are pulled
        const currentSession = getSession();
        if (currentSession) {
          const fresh = getUserByUsername(currentSession.username);
          if (fresh?.isEnabled) {
            setUser(fresh);
            setSession(fresh);
          } else {
            clearSession();
            setUser(null);
          }
        }
      } catch (e) {
        console.warn("[Auth] pullUsersFromBackend failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      // Try backend first for freshest credentials
      try {
        const actor = await getActor();
        const result = await actor.verifyCredentials(username, btoa(password));
        const backendUserRaw = result[0];
        if (result.length > 0 && backendUserRaw !== undefined) {
          const backendUser = fromBackendUser(backendUserRaw);
          if (!backendUser.isEnabled) return false;
          setSession(backendUser);
          setUser(backendUser);
          return true;
        }
        // Backend returned empty opt — credentials invalid
        // Still check locally in case backend hasn't synced yet
      } catch (e) {
        console.warn(
          "[Auth] Backend verifyCredentials failed, falling back to local:",
          e,
        );
        resetActor();
      }

      // Fallback to local credentials
      const verified = verifyCredentials(username, password);
      if (!verified) return false;
      setSession(verified);
      setUser(verified);
      return true;
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const refresh = useCallback(() => {
    if (!user) return;
    const fresh = getUserByUsername(user.username);
    if (fresh) {
      setUser(fresh);
      setSession(fresh);
    }
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    if (user.elevatedUntil && user.elevatedUntil > Date.now()) return true;
    return false;
  }, [user]);

  const hasRole = useCallback(
    (...roles: AppUser["role"][]): boolean => {
      if (!user) return false;
      if (isAdmin()) return true;
      return roles.includes(user.role);
    },
    [user, isAdmin],
  );

  return (
    <AuthContext.Provider
      value={{ user, login, logout, refresh, isAdmin, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
