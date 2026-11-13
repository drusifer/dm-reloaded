/** Failure-tolerant persistence adapter for saves; the UI never touches storage directly. */

export const SAVE_SLOT_KEY = 'dm_reloaded_save_slot_v1';

export type StoreWrite = { readonly ok: true } | { readonly ok: false; readonly text: string };
export type StoreRead =
  | { readonly ok: true; readonly text: string | null }
  | { readonly ok: false; readonly text: string };

export function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function writeSlot(storage: Pick<Storage, 'setItem'> | null, text: string): StoreWrite {
  if (!storage) return { ok: false, text: 'SAVE FAILED: BROWSER STORAGE IS UNAVAILABLE.' };
  try {
    storage.setItem(SAVE_SLOT_KEY, text);
    return { ok: true };
  } catch {
    return { ok: false, text: 'SAVE FAILED: BROWSER STORAGE IS FULL OR BLOCKED.' };
  }
}

export function readSlot(storage: Pick<Storage, 'getItem'> | null): StoreRead {
  if (!storage) return { ok: false, text: 'LOAD FAILED: BROWSER STORAGE IS UNAVAILABLE.' };
  try {
    return { ok: true, text: storage.getItem(SAVE_SLOT_KEY) };
  } catch {
    return { ok: false, text: 'LOAD FAILED: BROWSER STORAGE IS BLOCKED.' };
  }
}

/** Offers a save as a downloaded file; returns false if the browser refuses. */
export function downloadSave(doc: Document, text: string, filename: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;
    doc.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
