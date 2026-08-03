import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PixelBoardService } from '@core/services/pixel-board.service';

import { Board } from './board';

describe('Grid', () => {
  let fixture: ComponentFixture<Board>;
  let board: PixelBoardService;

  const cells = (): HTMLButtonElement[] =>
    fixture.debugElement
      .queryAll(By.css('.board__cell'))
      .map((ref) => ref.nativeElement as HTMLButtonElement);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Board],
    }).compileComponents();

    board = TestBed.inject(PixelBoardService);
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

  it('paints only the clicked cell, with the color selected on the service', async () => {
    board.selectColor('#E50000');

    cells()[17].click();
    await fixture.whenStable();

    expect(cells()[17].style.backgroundColor).toBe('rgb(229, 0, 0)');
    expect(cells()[16].style.backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('delegates the clicked coordinates to the service', async () => {
    board.selectColor('#94E044');

    cells()[34].click();
    await fixture.whenStable();

    expect(board.lastPainted()).toEqual({ x: 2, y: 2, color: '#94E044' });
  });

  it('repaints when the board changes outside of the component', async () => {
    board.selectColor('#0000EA');
    board.paint(0, 0);
    await fixture.whenStable();

    expect(cells()[0].style.backgroundColor).toBe('rgb(0, 0, 234)');
  });
});
