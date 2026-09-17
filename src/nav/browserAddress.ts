// The only module that touches `window.location` and `window.history`. It
// reads the current fragment, changes it, and tells its subscribers whenever
// it changes — whether the browser changed it, through a traversal or a
// fragment jump, or the app did, through a push or a replace.
//
// Pushing and replacing keep the path and the query exactly as they are, so a
// build served from a subfolder stays in its subfolder, and neither writes
// anything into `history.state`.

type AddressListener = () => void;

const listeners = new Set<AddressListener>();

/** The fragment showing now, `""` when there is none. */
export function currentHash(): string {
  return window.location.hash;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Registers a listener, called whenever the address changes, and returns the
 * function that removes it. The window listeners are attached while at least
 * one subscriber wants them and removed once the last one leaves.
 */
export function subscribeToAddress(listener: AddressListener): () => void {
  if (listeners.size === 0) {
    window.addEventListener("popstate", notify);
    window.addEventListener("hashchange", notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("popstate", notify);
      window.removeEventListener("hashchange", notify);
    }
  };
}

/**
 * The URL for a fragment: this page's own path and query, with the fragment
 * on the end. Built explicitly because writing an empty URL does not clear a
 * fragment that is already there.
 */
function urlForHash(hash: string): string {
  const { pathname, search } = window.location;
  return `${pathname}${search}${hash}`;
}

/** Adds a history entry showing `hash`, and tells the subscribers. */
export function pushHash(hash: string): void {
  window.history.pushState(null, "", urlForHash(hash));
  notify();
}

/** Replaces the current history entry with `hash`, and tells the subscribers. */
export function replaceHash(hash: string): void {
  window.history.replaceState(null, "", urlForHash(hash));
  notify();
}

/**
 * Goes back one history entry. The browser performs this asynchronously, so
 * the subscribers hear about it from `popstate`, not from this call.
 */
export function goBack(): void {
  window.history.back();
}
