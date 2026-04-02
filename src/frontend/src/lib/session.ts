// Session management using sessionStorage
import type { AppUser } from "../types";

export type { AppUser };

const SESSION_KEY = "swish_session";

export function setSession(user: AppUser): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn("Failed to set session:", e);
  }
}

export function getSession(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn("Failed to clear session:", e);
  }
}
