// NO-OP STUB: This app uses username/password auth only.
// Zero imports from @dfinity/auth-client or any II library.
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

const stubValue: InternetIdentityContext = {
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
  createContext<InternetIdentityContext>(stubValue);

export const useInternetIdentity = (): InternetIdentityContext => {
  return useContext(InternetIdentityReactContext);
};

export function InternetIdentityProvider({
  children,
}: { children: ReactNode }) {
  return createElement(
    InternetIdentityReactContext.Provider,
    { value: stubValue },
    children,
  );
}
