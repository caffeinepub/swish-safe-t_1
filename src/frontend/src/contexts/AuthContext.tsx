import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  login: (username: string, password: string) => boolean;
  logout: () => void;
  refresh: () => void;
  isAdmin: () => boolean;
  hasRole: (...roles: AppUser["role"][]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    ensureAdminSeeded();
    seedSampleData();
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
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const verified = verifyCredentials(username, password);
    if (!verified) return false;
    setSession(verified);
    setUser(verified);
    return true;
  }, []);

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
