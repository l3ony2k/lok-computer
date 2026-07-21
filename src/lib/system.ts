export const SYSTEM_VERSION = window.__SYSTEM_VERSION__ ?? "0.0.0";

const BOOT_REASON_KEY = "lok-computer:boot-reason";
const BOOT_MODE_KEY = "lok-computer:boot-mode";

export type SystemBootMode = "normal" | "kernel-panic";

export interface SystemVersionManifest {
  version: string;
  releasedAt?: string;
}

const versionParts = (version: string) =>
  version.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);

export const compareSystemVersions = (candidate: string, current = SYSTEM_VERSION) => {
  const candidateParts = versionParts(candidate);
  const currentParts = versionParts(current);
  const length = Math.max(candidateParts.length, currentParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (candidateParts[index] || 0) - (currentParts[index] || 0);
    if (difference !== 0) return difference;
  }

  return 0;
};

export const fetchSystemVersion = async (): Promise<SystemVersionManifest> => {
  const response = await fetch(`/system-version.json?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });

  if (!response.ok) {
    throw new Error(`Version check failed (${response.status})`);
  }

  return response.json() as Promise<SystemVersionManifest>;
};

export const consumeBootReason = () => {
  try {
    const reason = sessionStorage.getItem(BOOT_REASON_KEY);
    sessionStorage.removeItem(BOOT_REASON_KEY);
    return reason;
  } catch {
    return null;
  }
};

export const consumeBootMode = (): SystemBootMode => {
  try {
    const mode = sessionStorage.getItem(BOOT_MODE_KEY);
    sessionStorage.removeItem(BOOT_MODE_KEY);
    return mode === "kernel-panic" ? "kernel-panic" : "normal";
  } catch {
    return "normal";
  }
};

export const requestSystemUpdateCheck = () => {
  window.dispatchEvent(new CustomEvent("lok-computer:check-update", { detail: { manual: true } }));
};

export const rebootSystem = async (reason = "manual reboot", targetVersion = SYSTEM_VERSION) => {
  try {
    sessionStorage.setItem(BOOT_REASON_KEY, reason);
  } catch {
    // Storage can be unavailable in private browsing; reboot still works.
  }

  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn("[System] Could not clear Cache Storage", error);
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn("[System] Could not unregister service workers", error);
  }

  const url = new URL(window.location.href);
  url.pathname = "/";
  url.hash = "";
  url.search = "";
  url.searchParams.set("reboot", targetVersion);
  url.searchParams.set("t", String(Date.now()));
  window.location.replace(url.toString());
};

export const rebootIntoKernelPanic = async () => {
  try {
    sessionStorage.setItem(BOOT_MODE_KEY, "kernel-panic");
  } catch {
    // If storage is unavailable, fall back to a regular reboot.
  }

  await rebootSystem("emergency restart after root filesystem corruption");
};
