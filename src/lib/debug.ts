export const isVerboseCacheLoggingEnabled = () => (
  typeof document !== "undefined"
  && document.documentElement.dataset.verboseCacheLogging === "true"
);

export const cacheDebugLog = (...messages: unknown[]) => {
  if (isVerboseCacheLoggingEnabled()) {
    console.info(...messages);
  }
};
