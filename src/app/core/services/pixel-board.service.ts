import { Service, signal } from '@angular/core';
import type { PaintedPixel } from '@core/models/pixel.interface';

const BOARD_SIZE = 16;
const EMPTY_COLOR = '#FFFFFF';
const DEFAULT_COLOR = '#000000';

@Service()
export class PixelBoardService {
  public readonly size = BOARD_SIZE;

  private readonly board = signal<readonly string[]>(
    Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => EMPTY_COLOR),
  );

  private readonly currentColor = signal(DEFAULT_COLOR);

  private readonly lastPixel = signal<PaintedPixel | null>(null);

  /** Flat, row-major list of cell colors. */
  readonly colors = this.board.asReadonly();

  /** Color the next painted pixel will take. Driven by the palette. */
  readonly selectedColor = this.currentColor.asReadonly();

  /** Most recent pixel placed on the board, or `null` before the first one. */
  readonly lastPainted = this.lastPixel.asReadonly();

  public selectColor(color: string): void {
    this.currentColor.set(color);
  }

  public paint(x: number, y: number): void {
    const index = y * BOARD_SIZE + x;
    const color = this.currentColor();

    this.board.update((colors) => colors.map((current, i) => (i === index ? color : current)));
    this.lastPixel.set({ x, y, color });
  }
}
