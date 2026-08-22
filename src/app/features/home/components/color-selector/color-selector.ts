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
  private readonly pixelBoardService = inject(PixelBoardService);

  private readonly selectedColor = this.pixelBoardService.selectedColor;

  protected readonly swatches = computed<SwatchState[]>(() => {
    const selected = this.selectedColor();

    return PALETTE.map((swatch) => ({
      ...swatch,
      selected: swatch.color === selected,
    }));
  });

  protected onSelect(color: string): void {
    this.pixelBoardService.selectColor(color);
  }
}
