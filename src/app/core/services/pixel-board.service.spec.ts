import { TestBed } from '@angular/core/testing';
import { cooldownError, createSupabaseMock } from '@core/mocks/supabase.mock';
import type { SupabaseMockState } from '@core/mocks/supabase.mock';

import { PixelBoardService } from './pixel-board.service';
import { SupabaseService } from './supabase.service';

describe('PixelBoardService', () => {
  let service: PixelBoardService;
  let supabase: SupabaseMockState;

  beforeEach(() => {
    const mock = createSupabaseMock();
    supabase = mock.state;

    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    service = TestBed.inject(PixelBoardService);
    service.connect();
  });

  it('starts with a blank board', () => {
    expect(service.board().length).toBe(service.size * service.size);
    expect(service.board().every((color) => color === '#FFFFFF')).toBe(true);
    expect(service.lastError()).toBeNull();
  });

  it('leaves the board untouched until the realtime event comes back', async () => {
    service.selectColor('#E50000');
    service.paint(3, 2);
    await Promise.resolve();

    expect(service.board().every((color) => color === '#FFFFFF')).toBe(true);
  });

  it('paints at the row-major index matching the realtime coordinates', () => {
    supabase.emit({ x: 3, y: 2, color: '#E50000' });

    expect(service.board()[2 * service.size + 3]).toBe('#E50000');
    expect(service.board().filter((color) => color === '#E50000').length).toBe(1);
  });

  it('overwrites an already painted pixel', () => {
    supabase.emit({ x: 1, y: 1, color: '#E50000' });
    supabase.emit({ x: 1, y: 1, color: '#222222' });

    expect(service.board()[service.size + 1]).toBe('#222222');
  });

  it('ignores realtime rows landing outside the board', () => {
    supabase.emit({ x: 16, y: 0, color: '#E50000' });

    expect(service.board().every((color) => color === '#FFFFFF')).toBe(true);
  });

  it('forwards the painted pixel to the paint_pixel function', async () => {
    service.selectColor('#E59500');
    service.paint(4, 5);
    await Promise.resolve();

    expect(supabase.rpcCalls).toEqual([{ p_x: 4, p_y: 5, p_color: '#E59500' }]);
  });

  it('paints with the most recently selected color', async () => {
    service.selectColor('#E50000');
    service.selectColor('#94E044');
    service.paint(0, 0);
    await Promise.resolve();

    expect(supabase.rpcCalls).toEqual([{ p_x: 0, p_y: 0, p_color: '#94E044' }]);
  });

  it('reports no error once the write is accepted', async () => {
    service.selectColor('#0083C7');
    service.paint(15, 15);
    await Promise.resolve();

    expect(supabase.rpcCalls).toEqual([{ p_x: 15, p_y: 15, p_color: '#0083C7' }]);
    expect(service.lastError()).toBeNull();
  });

  it('clears the previous error when a new pixel is sent', async () => {
    supabase.rpcError = cooldownError(3);
    service.paint(6, 6);
    await Promise.resolve();

    expect(service.lastError()).not.toBeNull();

    supabase.rpcError = null;
    service.paint(7, 7);

    expect(service.lastError()).toBeNull();
  });

  it('ignores coordinates outside the board', () => {
    service.paint(16, 0);
    service.paint(-1, 0);

    expect(supabase.rpcCalls.length).toBe(0);
  });

  it('hydrates the board from the persisted pixels on connect', async () => {
    supabase.rows = [
      { x: 0, y: 0, color: '#E50000' },
      { x: 2, y: 1, color: '#0000EA' },
    ];

    service.connect();
    await Promise.resolve();

    expect(service.board()[0]).toBe('#E50000');
    expect(service.board()[service.size + 2]).toBe('#0000EA');
    expect(service.boardLoading()).toBe(false);
  });

  it('reports the remaining wait when the cooldown rejects the write', async () => {
    supabase.rpcError = cooldownError(3);

    service.selectColor('#E50000');
    service.paint(6, 6);
    await Promise.resolve();

    expect(service.board()[6 * service.size + 6]).toBe('#FFFFFF');
    expect(service.lastError()).toBe('Attends encore 3s avant de repeindre ce pixel.');
  });
});
