/**
 * Registers the service worker built by vite.config.ts. Production only: the
 * dev server has no /sw.js, and a worker would hide its hot updates. Reboot
 * (src/lib/system.ts) unregisters it and clears every cache before reloading,
 * so an update always starts clean.
 */
export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[System] Service worker registration failed:", error);
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
};
