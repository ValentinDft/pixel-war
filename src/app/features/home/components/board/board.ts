import { Component, computed, inject } from '@angular/core';
import { PixelBoardService } from '@core/services/pixel-board.service';
import type { Row } from './interfaces/board.interface';

@Component({
  selector: 'pix-board',
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private pixelBoardService = inject(PixelBoardService);

  protected size = this.pixelBoardService.size;

  protected rows = computed<Row[]>(() => {
    const colors = this.pixelBoardService.board();
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
