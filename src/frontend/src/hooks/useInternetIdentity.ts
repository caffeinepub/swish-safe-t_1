// NO-OP STUB — Internet Identity is not used in this app.
// This file exists only to satisfy any stale imports.
// Zero @dfinity imports — nothing II-related will ever run.
import {
  type ReactNode,
  createContext,
  createElement,
  useContext,
} from "react";

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

const ctx = createContext<InternetIdentityContext>({
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
});

export const useInternetIdentity = (): InternetIdentityContext =>
  useContext(ctx);

export function InternetIdentityProvider({
  children,
}: { children: ReactNode }) {
  return createElement(ctx.Provider, {
    value: {
      identity: undefined,
      login: () => {},
      clear: () => {},
      loginStatus: "idle" as Status,
      isInitializing: false,
      isLoginIdle: true,
      isLoggingIn: false,
      isLoginSuccess: false,
      isLoginError: false,
      loginError: undefined,
    },
    children,
  });
}
