import { describe, expect, it } from 'vitest';
import { SAVE_SLOT_KEY, readSlot, writeSlot } from '../../src/ui/saveStore';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; }
  };
}

describe('S5-1 save store adapter', () => {
  it('writes and reads the single slot', () => {
    const storage = memoryStorage();
    expect(writeSlot(storage, 'payload')).toEqual({ ok: true });
    expect(storage.data[SAVE_SLOT_KEY]).toBe('payload');
    expect(readSlot(storage)).toEqual({ ok: true, text: 'payload' });
    expect(readSlot(memoryStorage())).toEqual({ ok: true, text: null });
  });

  it('reports unavailable, full, and blocked storage without throwing', () => {
    const w = writeSlot(null, 'x');
    expect(!w.ok && w.text).toMatch(/UNAVAILABLE/);
    const r = readSlot(null);
    expect(!r.ok && r.text).toMatch(/UNAVAILABLE/);
    const full = { setItem: () => { throw new Error('quota'); } };
    const fw = writeSlot(full, 'x');
    expect(!fw.ok && fw.text).toMatch(/FULL OR BLOCKED/);
    const blocked = { getItem: () => { throw new Error('denied'); } };
    const br = readSlot(blocked);
    expect(!br.ok && br.text).toMatch(/BLOCKED/);
  });
});
