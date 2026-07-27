import { APPLICATIONS } from "@/config/apps";

const loaders = Array.from(new Set(Object.values(APPLICATIONS).map((application) => application.loader)));

export const APP_MODULE_COUNT = loaders.length;

export const preloadAppModules = async (onProgress?: (loaded: number, total: number) => void) => {
  let loaded = 0;
  const results = await Promise.allSettled(loaders.map(async (loader) => {
    await loader();
    loaded += 1;
    onProgress?.(loaded, loaders.length);
  }));

  return results.filter((result) => result.status === "rejected").length;
};
