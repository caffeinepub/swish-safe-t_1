// This hook is not used by the app (which uses getActor() from lib/actor.ts directly).
// Kept as a stub to avoid import errors if any file references it.
export function useActor() {
  return { actor: null, isFetching: false };
}
