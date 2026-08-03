import { Component } from '@angular/core';
import { Header } from '@features/home/components/header/header';
import { Board } from '@features/home/components/board/board';

@Component({
  selector: 'pix-home',
  imports: [Header, Board],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
