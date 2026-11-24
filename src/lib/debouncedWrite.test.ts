import { describe, expect, it, mock } from 'bun:test';
import { createDebouncedWrite } from '@/lib/debouncedWrite';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setup = () => {
  const write = mock(async (_key: string, _value: string) => undefined);
  return { write, writer: createDebouncedWrite<string>(write) };
};

describe('createDebouncedWrite', () => {
  it('writes only the latest value once the debounce passes', async () => {
    const { write, writer } = setup();

    writer.schedule('note', 'a', 10);
    writer.schedule('note', 'ab', 10);
    expect(write).not.toHaveBeenCalled();
    await wait(25);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith('note', 'ab');
    expect(writer.hasPending()).toBeFalse();
  });

  it('flush sends the pending value now instead of dropping it', async () => {
    const { write, writer } = setup();

    writer.schedule('note', 'unsaved', 1000);
    writer.flush();
    expect(write).toHaveBeenCalledWith('note', 'unsaved');
    expect(writer.hasPending()).toBeFalse();

    await wait(5);
    writer.flush();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending write for another key before scheduling the new one', async () => {
    const { write, writer } = setup();

    writer.schedule('old', 'kept', 1000);
    writer.schedule('new', 'next', 10);
    expect(write).toHaveBeenCalledWith('old', 'kept');
    await wait(25);

    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith('new', 'next');
  });

  it('reports a failed write instead of throwing', async () => {
    const write = mock(async () => { throw new Error('quota'); });
    const writer = createDebouncedWrite<string>(write);
    const error = console.error;
    const logged = mock(() => undefined);
    console.error = logged;

    writer.schedule('note', 'x', 0);
    writer.flush();
    await wait(5);
    console.error = error;

    expect(logged).toHaveBeenCalledTimes(1);
  });
});

describe('flush on unload', () => {
  it('uses the unload writer for the pending value', () => {
    const normal: string[] = [];
    const unload: string[] = [];
    const writer = createDebouncedWrite<string>(
      async (key, value) => { normal.push(`${key}=${value}`); },
      (key, value) => { unload.push(`${key}=${value}`); },
    );
    writer.schedule('app:chance', 'cards', 200);
    writer.flush(true);
    expect(unload).toEqual(['app:chance=cards']);
    expect(normal).toEqual([]);
    expect(writer.hasPending()).toBe(false);
  });
});
