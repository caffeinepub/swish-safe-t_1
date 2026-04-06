// NO-OP STUB — Internet Identity is NOT used in this app.
// Username/password auth is implemented in AuthContext instead.
// DO NOT import @dfinity/auth-client here.

import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useContext,
} from "react";

export type Status = "idle";

export type InternetIdentityContext = {
  identity: undefined;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: false;
  isLoginIdle: true;
  isLoggingIn: false;
  isLoginSuccess: false;
  isLoginError: false;
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

export function useInternetIdentity(): InternetIdentityContext {
  return useContext(ctx);
}

export function InternetIdentityProvider({
  children,
}: PropsWithChildren<{ children: ReactNode }>) {
  return createElement(ctx.Provider, {
    value: {
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
    },
    children,
  });
}
