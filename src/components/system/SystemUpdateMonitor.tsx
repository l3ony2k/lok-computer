import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  compareSystemVersions,
  fetchSystemVersion,
  rebootSystem,
  SYSTEM_VERSION,
} from "@/lib/system";

const DISMISSED_UPDATE_KEY = "lok-computer:dismissed-update";

export const SystemUpdateMonitor = () => {
  const checkForUpdate = useCallback(async (manual = false) => {
    try {
      const manifest = await fetchSystemVersion();
      const updateAvailable = compareSystemVersions(manifest.version) > 0;

      if (!updateAvailable) {
        if (manual) toast.success(`System v${SYSTEM_VERSION} is current.`);
        return;
      }

      const dismissedVersion = sessionStorage.getItem(DISMISSED_UPDATE_KEY);
      if (!manual && dismissedVersion === manifest.version) return;

      toast(`System update v${manifest.version} available`, {
        id: `system-update-${manifest.version}`,
        description: `Running v${SYSTEM_VERSION}. Reboot to load and cache the new system code.`,
        duration: Infinity,
        action: {
          label: "UPDATE",
          onClick: () => void rebootSystem(`updating system to v${manifest.version}`, manifest.version),
        },
        cancel: {
          label: "LATER",
          onClick: () => sessionStorage.setItem(DISMISSED_UPDATE_KEY, manifest.version),
        },
      });
    } catch (error) {
      console.warn("[System] Update check failed", error);
      if (manual) toast.error("Could not reach the update server.");
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => void checkForUpdate(false), 1200);
    const interval = setInterval(() => void checkForUpdate(false), 10 * 60 * 1000);
    const handleManualCheck = () => void checkForUpdate(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void checkForUpdate(false);
    };

    window.addEventListener("lok-computer:check-update", handleManualCheck);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("lok-computer:check-update", handleManualCheck);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkForUpdate]);

  return null;
};
