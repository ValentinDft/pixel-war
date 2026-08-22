import { Component } from '@angular/core';
import { Header } from '@features/home/components/header/header';
import { Board } from '@features/home/components/board/board';
import { ColorSelector } from '@features/home/components/color-selector/color-selector';

@Component({
  selector: 'pix-home',
  imports: [Header, Board, ColorSelector],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
