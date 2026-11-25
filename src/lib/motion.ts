/**
 * Whether the person asked the system for less motion. Animations that run in
 * script check this before they start; stylesheets use the media query
 * directly. Every script check goes through here (sharedHelpers.test.ts checks).
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
