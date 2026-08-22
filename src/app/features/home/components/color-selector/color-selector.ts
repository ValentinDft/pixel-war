import { Component, computed, inject } from '@angular/core';
import { PixelBoardService } from '@core/services/pixel-board.service';
import { PALETTE } from './constants/color-selector.constant';
import type { SwatchState } from './interfaces/color-selector.interface';

@Component({
  selector: 'pix-color-selector',
  templateUrl: './color-selector.html',
  styleUrl: './color-selector.scss',
})
export class ColorSelector {
  private pixelBoardService = inject(PixelBoardService);

  protected swatches = computed<SwatchState[]>(() => {
    const currentColor = this.pixelBoardService.currentColor();

    return PALETTE.map((swatch) => ({
      ...swatch,
      selected: swatch.color === currentColor,
    }));
  });

  protected onSelect(color: string): void {
    this.pixelBoardService.selectColor(color);
  }
}
