import { type ReactNode, useEffect, useMemo, useState } from "react";
import { APP_MODULE_COUNT, preloadAppModules } from "@/config/preloadApps";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { loadThemeStyles, THEMES } from "@/lib/theme";
import { useWindowState } from "@/hooks/useWindowManager";
import { getUserChannels } from "@/lib/api";
import { consumeBootMode, consumeBootReason, SYSTEM_VERSION } from "@/lib/system";

const RICK_ROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const bundledAssetModules = import.meta.glob(
  "/src/assets/**/*.{png,gif,jpg,jpeg,webp,avif,svg}",
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
  { label: "settings", detail: "mounting user settings", state: "waiting" },
  { label: "session", detail: "restoring window session", state: "waiting" },
];

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
  const { isSessionRestored } = useWindowState();
  const { theme } = useTheme();
  const [bootTheme] = useState(theme);
  const [stages, setStages] = useState(initialStages);
  const [preloadReady, setPreloadReady] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [bootReason] = useState(() => consumeBootReason());
  const [bootMode] = useState(() => consumeBootMode());

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
        if (!cancelled) updateStage("modules", {
          detail: failures ? `app modules ready (${failures} deferred)` : "all app modules cached",
          state: failures ? "warning" : "done",
        });
      });

      const assetTask = preloadLocalAssets((loaded, total) => {
        if (!cancelled) updateStage("assets", { detail: `loading local assets ${loaded}/${total}` });
      }).then((failures) => {
        if (!cancelled) updateStage("assets", {
          detail: failures ? `local assets ready (${failures} deferred)` : "all local assets cached",
          state: failures ? "warning" : "done",
        });
      });

      const cacheTask = withTimeout(getUserChannels("lok"), 5000)
        .then((channels) => {
          if (!cancelled) updateStage("cache", {
            detail: channels ? `Are.na index cached (${channels.length} channels)` : "Are.na index deferred",
            state: channels ? "done" : "warning",
          });
        })
        .catch(() => {
          if (!cancelled) updateStage("cache", { detail: "Are.na index available on demand", state: "warning" });
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

      await Promise.all([moduleTask, assetTask, cacheTask, themeTask, fontTask]);

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

  useEffect(() => {
    updateStage("session", isSessionRestored
      ? { detail: "window session restored", state: "done" }
      : { detail: "restoring window session", state: "running" });
  }, [isSessionRestored]);

  useEffect(() => {
    if (!preloadReady || settingsLoading || !isSessionRestored) return;

    const exitTimer = setTimeout(() => setExiting(true), 180);
    const completeTimer = setTimeout(() => setBootComplete(true), 430);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isSessionRestored, preloadReady, settingsLoading]);

  const progress = useMemo(() => {
    const finished = stages.filter((stage) => stage.state === "done" || stage.state === "warning").length;
    return Math.round((finished / stages.length) * 100);
  }, [stages]);

  if (bootMode === "kernel-panic") {
    return (
      <main className="system-boot-screen system-kernel-panic" aria-label="Kernel panic">
        <div className="system-boot-terminal">
          <div className="system-kernel-panic-title">KERNEL PANIC</div>
          <pre>{`Kernel panic - not syncing: No working init found.
VFS: Unable to mount root fs on unknown-block(0,0)
CPU: 0 PID: 1 Comm: init Not tainted ${SYSTEM_VERSION}
Call Trace:
 panic+0x101/0x2e3
 mount_block_root+0x16a/0x31d
 prepare_namespace+0x13f/0x175
 kernel_init_freeable+0x2c8/0x2f2
---[ end Kernel panic - not syncing: VFS: Unable to mount root fs ]---`}</pre>
          <button
            type="button"
            className="system-kernel-retry"
            onClick={() => window.open(RICK_ROLL_URL, "_blank", "noopener,noreferrer")}
          >
            RETRY BOOT
          </button>
        </div>
      </main>
    );
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
      </div>
    </main>
  );
};
