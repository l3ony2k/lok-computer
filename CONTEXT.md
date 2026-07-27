# Domain Context

## Application

A restorable program that opens inside a desktop window. An Application has one stable `componentType`, one lazy loader, default window chrome, default props, and optional single-instance behavior. `src/config/apps.tsx` is the source of truth.

## Application launch

The act of turning an Application identity and domain props into a live, restorable window. `useApplicationLauncher` owns runtime rendering, defaults, serialized identity, and single-instance behavior.

## Window session

The serializable set of open windows, their geometry, stacking order, state, Application identity, and domain props. The window manager persists the Window session to IndexedDB.

## Cached request

A remote read whose persistent lifecycle includes TTL lookup, request accounting, debug logging, loading, and cache write. Source-specific modules own URL construction and decoding; `cachedRequest` owns the lifecycle.

## Persisted view state

User-facing view choices that survive reloads, including normalization of legacy values, initial-load protection, key changes, and debounced writes. `usePersistedState` owns this lifecycle.

## Social feed

The shared profile-and-post browsing experience used by Bsky and Fedi. Bsky and Fedi are adapters at the Social feed seam; the shared module owns query coordination, paging, terminal states, chrome, and media launch.

## Are.na channel browsing

The lifecycle for ordered channel contents, pagination, cancellation, dedupe, and selected-item restoration. Remote Are.na pages and supplied in-memory items are adapters at this seam.
