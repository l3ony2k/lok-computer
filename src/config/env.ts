import { resolveDeployment } from './deployment';

/**
 * This build's deployment settings (environment variables with lok.computer's
 * defaults). Kept apart from site.ts, which imports images, so plain modules
 * like constants.ts can read it everywhere, the Worker's type-check included.
 */
export const DEPLOYMENT = resolveDeployment(import.meta.env);
