import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PixelBoardService } from '@core/services/pixel-board.service';
import { SupabaseService } from '@core/services/supabase.service';
import { createSupabaseMock } from '@core/mocks/supabase.mock';
import type { SupabaseMockState } from '@core/mocks/supabase.mock';

import { Board } from './board';

describe('Grid', () => {
  let fixture: ComponentFixture<Board>;
  let board: PixelBoardService;
  let supabase: SupabaseMockState;

  const cells = (): HTMLButtonElement[] =>
    fixture.debugElement
      .queryAll(By.css('.board__cell'))
      .map((ref) => ref.nativeElement as HTMLButtonElement);

  beforeEach(async () => {
    const mock = createSupabaseMock();
    supabase = mock.state;

    await TestBed.configureTestingModule({
      imports: [Board],
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    }).compileComponents();

    board = TestBed.inject(PixelBoardService);
    board.connect();
    fixture = TestBed.createComponent(Board);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one row and one cell per board coordinate', () => {
    expect(fixture.debugElement.queryAll(By.css('.board__row')).length).toBe(board.size);
    expect(cells().length).toBe(board.size * board.size);
  });

  it('paints only the cell the realtime event points at', async () => {
    supabase.emit({ x: 1, y: 1, color: '#E50000' });
    await fixture.whenStable();

    expect(cells()[17].style.backgroundColor).toBe('rgb(229, 0, 0)');
    expect(cells()[16].style.backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('delegates the clicked coordinates to the service', async () => {
    board.selectColor('#94E044');

    cells()[34].click();
    await fixture.whenStable();

    expect(supabase.rpcCalls).toEqual([{ p_x: 2, p_y: 2, p_color: '#94E044' }]);
  });

  it('leaves the clicked cell blank until the write comes back', async () => {
    board.selectColor('#0000EA');

    cells()[0].click();
    await fixture.whenStable();

    expect(cells()[0].style.backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('repaints when the board changes outside of the component', async () => {
    supabase.emit({ x: 0, y: 0, color: '#0000EA' });
    await fixture.whenStable();

    expect(cells()[0].style.backgroundColor).toBe('rgb(0, 0, 234)');
  });
});
