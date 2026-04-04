// NO-OP STUB — This app uses username/password auth only.
// Zero DFINITY imports. Do NOT add any @dfinity imports here.

export type Status = "idle";

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

export function useInternetIdentity(): InternetIdentityContext {
  return {
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
}

export function InternetIdentityProvider({
  children,
}: { children: React.ReactNode }) {
  return children as React.ReactElement;
}
