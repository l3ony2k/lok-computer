import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

const subscribe = (notify: () => void) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", notify)
  return () => mql.removeEventListener("change", notify)
}

const isMobile = () => window.matchMedia(QUERY).matches

/** True below the mobile breakpoint; correct on the first render, no extra pass. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, isMobile, () => false)
}
