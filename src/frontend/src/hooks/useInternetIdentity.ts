// NO-OP STUB — Internet Identity is not used in this app.
// Username/password auth is handled entirely by AuthContext and the ICP backend.
// DO NOT import or use @dfinity/auth-client here.

import {
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
