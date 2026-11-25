import { toast } from 'sonner';

interface CopyOptions {
  /** What was copied, for the toast ("Link" shows "Link copied"); "Copied" without it. */
  what?: string;
  /** False when the caller shows success itself (a button that reads "Copied!"); failures always toast. */
  announce?: boolean;
}

/**
 * Copies text to the clipboard and says so with one toast wording. Resolves to
 * whether it worked and never rejects. Every copy goes through here
 * (sharedHelpers.test.ts checks).
 */
export const copyText = async (text: string, { what, announce = true }: CopyOptions = {}): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    if (announce) toast.success(what ? `${what} copied` : 'Copied');
    return true;
  } catch (error) {
    console.warn('[Clipboard] Could not copy:', error);
    toast.error("Couldn't copy to the clipboard.");
    return false;
  }
};
