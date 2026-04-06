// NO-OP STUB -- Internet Identity is not used in this app.
// Authentication is handled via username/password stored in the ICP backend.
// DO NOT import @dfinity/auth-client or AuthClient here.

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

const noop = () => {};

const stub: InternetIdentityContext = {
  identity: undefined,
  login: noop,
  clear: noop,
  loginStatus: "idle",
  isInitializing: false,
  isLoginIdle: true,
  isLoggingIn: false,
  isLoginSuccess: false,
  isLoginError: false,
  loginError: undefined,
};

const InternetIdentityReactContext =
  createContext<InternetIdentityContext>(stub);

export const useInternetIdentity = (): InternetIdentityContext => {
  return useContext(InternetIdentityReactContext);
};

export function InternetIdentityProvider({
  children,
}: { children: ReactNode }) {
  return createElement(
    InternetIdentityReactContext.Provider,
    { value: stub },
    children,
  );
}
