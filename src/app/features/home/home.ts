import { Component, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import { PixelBoardService } from '@core/services/pixel-board.service';
import { Header } from '@features/home/components/header/header';
import { Board } from '@features/home/components/board/board';
import { ColorSelector } from '@features/home/components/color-selector/color-selector';

@Component({
  selector: 'pix-home',
  imports: [Header, Board, ColorSelector],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private pixelBoardService = inject(PixelBoardService);

  protected lastError = this.pixelBoardService.lastError;

  ngOnInit(): void {
    this.pixelBoardService.connect();
  }
}
