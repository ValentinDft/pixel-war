import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PixelBoardService } from '@core/services/pixel-board.service';

import { ColorSelector } from './color-selector';

describe('ColorSelector', () => {
  let fixture: ComponentFixture<ColorSelector>;
  let board: PixelBoardService;

  const swatches = (): HTMLButtonElement[] =>
    fixture.debugElement
      .queryAll(By.css('.color-selector__swatch'))
      .map((ref) => ref.nativeElement as HTMLButtonElement);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorSelector],
    }).compileComponents();

    board = TestBed.inject(PixelBoardService);
    fixture = TestBed.createComponent(ColorSelector);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the 16 palette swatches inside a radio group', () => {
    const group = fixture.debugElement.query(By.css('.color-selector'))
      .nativeElement as HTMLElement;

    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(swatches().length).toBe(16);
    expect(swatches().every((swatch) => swatch.getAttribute('role') === 'radio')).toBe(true);
  });

  it('marks exactly the selected color as checked', () => {
    board.selectColor('#0083C7');
    fixture.detectChanges();

    const checked = swatches().filter((swatch) => swatch.getAttribute('aria-checked') === 'true');

    expect(checked.length).toBe(1);
    expect(checked[0].getAttribute('aria-label')).toBe('Bleu');
  });

  it('selects a color on click', async () => {
    swatches()[5].click();
    await fixture.whenStable();

    expect(board.selectedColor()).toBe('#E50000');
    expect(swatches()[5].getAttribute('aria-checked')).toBe('true');
  });

  it('keeps every swatch reachable by keyboard', () => {
    expect(swatches().every((swatch) => swatch.getAttribute('tabindex') === null)).toBe(true);
  });
});
