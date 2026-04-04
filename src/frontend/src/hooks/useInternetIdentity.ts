/**
 * NO-OP STUB — Internet Identity is NOT used in this app.
 * This file exists only to satisfy any legacy imports.
 * Zero DFINITY imports. Zero AuthClient calls. Zero side effects.
 */
import type { ReactNode } from "react";
import { createElement } from "react";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

export type InternetIdentityContext = {
  identity: undefined;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError: undefined;
};

const NOOP_CONTEXT: InternetIdentityContext = {
  identity: undefined,
  login: () => {},
  clear: () => {},
  loginStatus: "idle",
  isInitializing: false,
  isLoginIdle: true,
  isLoggingIn: false,
  isLoginSuccess: false,
  isLoginError: false,
  loginError: undefined,
};

/** Always returns a no-op identity context. */
export function useInternetIdentity(): InternetIdentityContext {
  return NOOP_CONTEXT;
}

/** Passthrough provider — renders children directly. No AuthClient, no DFINITY. */
export function InternetIdentityProvider({
  children,
}: {
  children: ReactNode;
}) {
  return createElement(children as never);
}
