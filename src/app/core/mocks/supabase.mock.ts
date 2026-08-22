import { PostgrestError } from '@supabase/supabase-js';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { PaintPixelArgs, PixelRow } from '@core/models/pixel.interface';
import type { SupabaseService } from '@core/services/supabase.service';

export interface SupabaseMockState {
  /** Rows returned by the initial board fetch. */
  rows: PixelRow[];
  /** Arguments of every `paint_pixel` call, in order. */
  rpcCalls: PaintPixelArgs[];
  /** Set to make the next `paint_pixel` calls fail. */
  rpcError: PostgrestError | null;
  /** Set to make the board fetch fail. */
  selectError: PostgrestError | null;
  /** Pushes a row through the realtime channel, as Postgres would after a write. */
  emit: (row: PixelRow) => void;
}

type ChangeHandler = (payload: RealtimePostgresChangesPayload<PixelRow>) => void;

interface FakeChannel {
  on: (event: string, filter: unknown, handler: ChangeHandler) => FakeChannel;
  subscribe: () => FakeChannel;
}

/**
 * Minimal stand-in for {@link SupabaseService}: the specs must not reach the real
 * project. Only the surface consumed by `PixelBoardService` is implemented.
 */
export function createSupabaseMock(): { service: SupabaseService; state: SupabaseMockState } {
  let handler: ChangeHandler | null = null;

  const state: SupabaseMockState = {
    rows: [],
    rpcCalls: [],
    rpcError: null,
    selectError: null,
    emit: (row) => {
      handler?.({ new: row } as RealtimePostgresChangesPayload<PixelRow>);
    },
  };

  const channel: FakeChannel = {
    on: (_event, _filter, changeHandler) => {
      handler = changeHandler;
      return channel;
    },
    subscribe: () => channel,
  };

  const client = {
    from: () => ({
      select: () =>
        Promise.resolve(
          state.selectError
            ? { data: null, error: state.selectError }
            : { data: state.rows, error: null },
        ),
    }),
    rpc: (_name: string, args: PaintPixelArgs) => {
      state.rpcCalls.push(args);
      return Promise.resolve({ data: null, error: state.rpcError });
    },
    channel: () => channel,
    removeChannel: () => Promise.resolve('ok'),
  };

  return { service: { client } as unknown as SupabaseService, state };
}

/** The error `paint_pixel` raises while the 5s cooldown is still running. */
export function cooldownError(seconds: number): PostgrestError {
  return new PostgrestError({
    message: 'cooldown',
    details: String(seconds),
    hint: '',
    code: 'P0001',
  });
}
