import { Component, computed, inject } from '@angular/core';
import { PixelBoardService } from '@core/services/pixel-board.service';
import type { Row } from './board.interface';

@Component({
  selector: 'pix-board',
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly pixelBoardService = inject(PixelBoardService);

  protected readonly size = this.pixelBoardService.size;

  protected readonly rows = computed<Row[]>(() => {
    const colors = this.pixelBoardService.colors();
    const { size } = this;

    return Array.from({ length: size }, (_, y) => ({
      y,
      cells: Array.from({ length: size }, (__, x) => {
        const index = y * size + x;
        return { index, x, y, color: colors[index] };
      }),
    }));
  });

  protected onCellClick(x: number, y: number): void {
    this.pixelBoardService.paint(x, y);
  }
}
