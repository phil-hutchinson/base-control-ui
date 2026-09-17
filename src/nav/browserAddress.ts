// The only module that touches `window.location` and `window.history`. It
// reads the current fragment, changes it, and tells its subscribers whenever
// it changes — whether the browser changed it, through a traversal or a
// fragment jump, or the app did, through a push or a replace.
//
// A change the browser made reaches guards first and subscribers second, both
// synchronously. A guard may put the address back before anything has learnt
// it moved, which is what lets a traversal be refused; the app's own pushes
// and replaces skip the guards, because they are not something to be refused.
//
// Pushing and replacing keep the path and the query exactly as they are, so a
// build served from a subfolder stays in its subfolder, and neither writes
// anything into `history.state`.

type AddressListener = () => void;

/** Runs when the browser has moved the address, before any subscriber hears. */
type AddressGuard = () => void;

const listeners = new Set<AddressListener>();
const guards = new Set<AddressGuard>();

// The address the guards were last run for. A single traversal fires both
// `popstate` and `hashchange` — in an order that differs between browsers —
// and the guards must see one change once, not one change twice.
let guardedHash: string | null = null;

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
 * What the browser's own address changes run: every guard, in registration
 * order, and then every subscriber. Guards go first so one of them can put
 * the address back before a subscriber renders anything from the new one.
 */
function handleBrowserChange() {
  const hash = currentHash();
  if (hash !== guardedHash) {
    guardedHash = hash;
    for (const guard of [...guards]) {
      guard();
    }
  }
  notify();
}

function attachWindowListeners() {
  if (listeners.size === 0 && guards.size === 0) {
    guardedHash = currentHash();
    window.addEventListener("popstate", handleBrowserChange);
    window.addEventListener("hashchange", handleBrowserChange);
  }
}

function detachWindowListenersIfIdle() {
  if (listeners.size === 0 && guards.size === 0) {
    window.removeEventListener("popstate", handleBrowserChange);
    window.removeEventListener("hashchange", handleBrowserChange);
  }
}

/**
 * Registers a listener, called whenever the address changes, and returns the
 * function that removes it. The window listeners are attached while at least
 * one subscriber or guard wants them and removed once the last one leaves.
 */
export function subscribeToAddress(listener: AddressListener): () => void {
  attachWindowListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    detachWindowListenersIfIdle();
  };
}

/**
 * Registers a guard, run before the subscribers on a change the browser made,
 * and returns the function that removes it. This module calls its guards
 * directly, so a guard runs to completion before anything can react to the
 * change — including react to it by removing the guard.
 */
export function registerAddressGuard(guard: AddressGuard): () => void {
  attachWindowListeners();
  guards.add(guard);
  return () => {
    guards.delete(guard);
    detachWindowListenersIfIdle();
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
  guardedHash = currentHash();
  notify();
}

/** Replaces the current history entry with `hash`, and tells the subscribers. */
export function replaceHash(hash: string): void {
  window.history.replaceState(null, "", urlForHash(hash));
  guardedHash = currentHash();
  notify();
}

/**
 * Goes back one history entry. The browser performs this asynchronously, so
 * the subscribers hear about it from `popstate`, not from this call.
 */
export function goBack(): void {
  window.history.back();
}
