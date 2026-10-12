import { type ReactNode, useEffect, useMemo, useState } from "react";
import { APP_CONFIG } from "@/config/constants";
import { APP_MODULE_COUNT, preloadAppModules } from "@/config/preloadApps";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { loadThemeStyles, THEMES } from "@/lib/theme";
import { useWindowState } from "@/hooks/useWindowManager";
import { getUserChannels } from "@/lib/api";
import { getUsageStats } from "@/lib/storage";
import { consumeBootMode, consumeBootReason, SYSTEM_VERSION } from "@/lib/system";
import { KernelPanic } from "./KernelPanic";
import { BiosSetup } from "./BiosSetup";

// Raster assets ship as hashed files (vite.config.ts keeps them out of the JS),
// so warming them here fills the HTTP cache before the desktop paints.
// The one SVG under assets is the icon script's vector source, not a runtime asset.
const bundledAssetModules = import.meta.glob(
  "/src/assets/**/*.{png,gif,jpg,jpeg,webp,avif}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const bundledAssetUrls = Array.from(new Set(Object.values(bundledAssetModules)));

type StageState = "waiting" | "running" | "done" | "warning";

interface BootStage {
  label: string;
  detail: string;
  state: StageState;
}

const initialStages: BootStage[] = [
  { label: "kernel", detail: `lok kernel ${SYSTEM_VERSION}`, state: "running" },
  { label: "modules", detail: "waiting for app modules", state: "waiting" },
  { label: "assets", detail: "waiting for local assets", state: "waiting" },
  { label: "theme", detail: "waiting for theme", state: "waiting" },
  { label: "cache", detail: "warming application data", state: "waiting" },
  { label: "storage", detail: "measuring storage", state: "waiting" },
  { label: "settings", detail: "mounting user settings", state: "waiting" },
  { label: "session", detail: "restoring window session", state: "waiting" },
];

const formatBytes = (bytes: number) => (
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
);

/**
 * Bytes the browser fetched for resources matching `pattern`, from the
 * resource timing buffer. A cached response reports no transfer, so the
 * encoded body size stands in; the POST numbers are real either way.
 */
const resourceBytes = (pattern: RegExp) => {
  let bytes = 0;
  let count = 0;
  for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
    if (!pattern.test(entry.name)) continue;
    count += 1;
    bytes += entry.transferSize || entry.encodedBodySize || 0;
  }
  return { bytes, count };
};

const SCRIPT_PATTERN = /\.(m?js|tsx?)(\?|$)/;
const IMAGE_PATTERN = /\.(png|gif|jpe?g|webp|avif)(\?|$)/;

const loadImage = (url: string) => new Promise<void>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve();
  image.onerror = () => reject(new Error(`Could not preload ${url}`));
  image.src = url;
});

const preloadLocalAssets = async (onProgress: (loaded: number, total: number) => void) => {
  let loaded = 0;
  const results = await Promise.allSettled(bundledAssetUrls.map(async (url) => {
    await loadImage(url);
    loaded += 1;
    onProgress(loaded, bundledAssetUrls.length);
  }));

  return results.filter((result) => result.status === "rejected").length;
};

/**
 * How long the boot waits for the warm-ups before showing the desktop. A
 * fresh install (an installed app has its own storage, so nothing is cached)
 * downloads every chunk and image here; past these bounds the desktop opens
 * and the downloads finish behind it, where the service worker still keeps
 * them for the next visit.
 */
const MODULE_WAIT_MS = 6000;
const ASSET_WAIT_MS = 4000;

const withTimeout = async <T,>(promise: Promise<T>, milliseconds: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), milliseconds);
  });

  const result = await Promise.race([promise, timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
};

export const SystemStartup = ({ children }: { children: ReactNode }) => {
  const { isLoading: settingsLoading } = useUserSettings();
  const { isSessionRestored, windows } = useWindowState();
  const { theme } = useTheme();
  const [bootTheme] = useState(theme);
  const [stages, setStages] = useState(initialStages);
  const [preloadReady, setPreloadReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [bootReason] = useState(() => consumeBootReason());
  const [bootMode] = useState(() => consumeBootMode());
  // DEL (or F2, or the DEL button) during boot opens the setup utility; the desktop waits for it.
  const [setupRequested, setSetupRequested] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    if (bootComplete || setupRequested) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "F2") return;
      event.preventDefault();
      setSetupRequested(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bootComplete, setupRequested]);

  const updateStage = (label: string, update: Partial<BootStage>) => {
    setStages((current) => current.map((stage) => (
      stage.label === label ? { ...stage, ...update } : stage
    )));
  };

  useEffect(() => {
    if (bootMode === "kernel-panic") return;

    let cancelled = false;
    const startedAt = performance.now();

    const runPreload = async () => {
      updateStage("kernel", { detail: `lok kernel ${SYSTEM_VERSION} online`, state: "done" });
      updateStage("modules", { detail: `loading app modules 0/${APP_MODULE_COUNT}`, state: "running" });
      updateStage("assets", { detail: `loading local assets 0/${bundledAssetUrls.length}`, state: "running" });
      updateStage("cache", { detail: "warming Are.na index", state: "running" });

      const moduleTask = preloadAppModules((loaded, total) => {
        if (!cancelled) updateStage("modules", { detail: `loading app modules ${loaded}/${total}` });
      }).then((failures) => {
        if (cancelled) return true;
        const scripts = resourceBytes(SCRIPT_PATTERN);
        const size = scripts.bytes ? `, ${formatBytes(scripts.bytes)} of script` : "";
        updateStage("modules", {
          detail: failures
            ? `app modules ready (${failures} deferred${size})`
            : `${APP_MODULE_COUNT} app modules cached (${scripts.count} files${size})`,
          state: failures ? "warning" : "done",
        });
        return true;
      });

      const assetTask = preloadLocalAssets((loaded, total) => {
        if (!cancelled) updateStage("assets", { detail: `loading local assets ${loaded}/${total}` });
      }).then((failures) => {
        if (cancelled) return true;
        const images = resourceBytes(IMAGE_PATTERN);
        const size = images.bytes ? `, ${formatBytes(images.bytes)}` : "";
        updateStage("assets", {
          detail: failures
            ? `local assets ready (${failures} deferred${size})`
            : `${bundledAssetUrls.length} local assets cached${size}`,
          state: failures ? "warning" : "done",
        });
        return true;
      });

      const cacheStartedAt = performance.now();
      const cacheTask = withTimeout(getUserChannels(APP_CONFIG.ARENA_USERNAME), 5000)
        .then(async (channels) => {
          if (cancelled) return;
          const latency = Math.round(performance.now() - cacheStartedAt);
          let hitRate = "";
          try {
            const stats = await getUsageStats();
            const total = stats.cacheHits + stats.cacheMisses;
            if (total > 0) hitRate = `, ${Math.round((stats.cacheHits / total) * 100)}% cache hits`;
          } catch {
            // Usage counters are a nicety; the stage reports without them.
          }
          if (cancelled) return;
          updateStage("cache", {
            detail: channels
              ? `Are.na index cached (${channels.length} channels, ${latency} ms${hitRate})`
              : `Are.na index deferred (${latency} ms${hitRate})`,
            state: channels ? "done" : "warning",
          });
        })
        .catch(() => {
          if (!cancelled) updateStage("cache", { detail: "Are.na index available on demand", state: "warning" });
        });

      updateStage("storage", { detail: "measuring storage", state: "running" });
      const storageTask = (navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve(null))
        .then((estimate) => {
          if (cancelled) return;
          const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
          const heapText = heap ? `, ${formatBytes(heap)} JS heap` : "";
          updateStage("storage", estimate && typeof estimate.usage === "number"
            ? { detail: `${formatBytes(estimate.usage)} in browser storage${heapText}`, state: "done" }
            : { detail: `storage estimate unavailable${heapText}`, state: "warning" });
        })
        .catch(() => {
          if (!cancelled) updateStage("storage", { detail: "storage estimate unavailable", state: "warning" });
        });

      const themeName = THEMES[bootTheme].name;
      updateStage("theme", { detail: `loading ${themeName} theme`, state: "running" });
      const themeTask = withTimeout(loadThemeStyles(bootTheme).then(() => true), 8000)
        .then((loaded) => {
          if (!cancelled) updateStage("theme", loaded
            ? { detail: `${themeName} theme applied`, state: "done" }
            : { detail: `${themeName} theme deferred`, state: "warning" });
        })
        .catch(() => {
          if (!cancelled) updateStage("theme", { detail: `${themeName} theme unavailable`, state: "warning" });
        });

      const fontTask = document.fonts?.ready
        ? withTimeout(document.fonts.ready, 4000)
        : Promise.resolve(null);

      const boundedModules = withTimeout(moduleTask, MODULE_WAIT_MS).then((done) => {
        if (done === null && !cancelled) updateStage("modules", { detail: "app modules loading in the background", state: "warning" });
      });
      const boundedAssets = withTimeout(assetTask, ASSET_WAIT_MS).then((done) => {
        if (done === null && !cancelled) updateStage("assets", { detail: "local assets loading in the background", state: "warning" });
      });

      await Promise.all([boundedModules, boundedAssets, cacheTask, storageTask, themeTask, fontTask]);

      const minimumBootTime = 700;
      const remaining = minimumBootTime - (performance.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      if (!cancelled) setPreloadReady(true);
    };

    void runPreload();
    return () => { cancelled = true; };
  }, [bootMode, bootTheme]);

  useEffect(() => {
    updateStage("settings", settingsLoading
      ? { detail: "mounting user settings", state: "running" }
      : { detail: "user settings mounted", state: "done" });
  }, [settingsLoading]);

  const windowCount = windows.length;
  useEffect(() => {
    updateStage("session", isSessionRestored
      ? { detail: windowCount ? `window session restored (${windowCount} ${windowCount === 1 ? "window" : "windows"})` : "window session restored (empty)", state: "done" }
      : { detail: "restoring window session", state: "running" });
  }, [isSessionRestored, windowCount]);

  useEffect(() => {
    if (!preloadReady || settingsLoading || !isSessionRestored) return;
    if (setupRequested && !setupDone) return;

    const exitTimer = setTimeout(() => setExiting(true), 180);
    const completeTimer = setTimeout(() => setBootComplete(true), 430);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isSessionRestored, preloadReady, settingsLoading, setupDone, setupRequested]);

  const progress = useMemo(() => {
    const finished = stages.filter((stage) => stage.state === "done" || stage.state === "warning").length;
    return Math.round((finished / stages.length) * 100);
  }, [stages]);

  if (bootMode === "kernel-panic") return <KernelPanic theme={theme} />;

  if (setupRequested && !setupDone && !settingsLoading) {
    return <BiosSetup onExit={() => setSetupDone(true)} />;
  }

  if (bootComplete) return <>{children}</>;

  return (
    <main className={`system-boot-screen ${exiting ? "system-boot-screen-exit" : ""}`} aria-label="System booting">
      <div className="system-boot-terminal">
        <div className="system-boot-brand" aria-hidden="true">
          <pre>{[
            " _          _",
            "| |    ___ | | __",
            "| |   / _ \\| |/ /",
            "| |__| (_) |   <",
            "|_____\\___/|_|\\_\\",
          ].join("\n")}</pre>
          <div>
            <strong>lok.computer</strong>
            <span>v{SYSTEM_VERSION}</span>
          </div>
        </div>

        <div className="system-boot-log" aria-live="polite">
          {bootReason && (
            <div className="system-boot-line">
              <span className="system-boot-status system-boot-status-info">INFO</span>
              <span>{bootReason}</span>
            </div>
          )}
          {stages.map((stage) => (
            <div className="system-boot-line" key={stage.label}>
              <span className={`system-boot-status system-boot-status-${stage.state}`}>
                {stage.state === "done" ? " OK " : stage.state === "warning" ? "WARN" : stage.state === "running" ? "...." : "WAIT"}
              </span>
              <span>{stage.detail}</span>
            </div>
          ))}
        </div>

        <div className="system-boot-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="system-boot-prompt">
          <span>root@lok</span>:~# boot desktop <span className="system-boot-cursor">_</span>
          <output>{String(progress).padStart(3, "0")}%</output>
        </div>
        <div className="system-boot-setup">
          Press <button type="button" className="system-boot-setup-key" onClick={() => setSetupRequested(true)}>DEL</button> to enter SETUP
        </div>
      </div>
    </main>
  );
};
