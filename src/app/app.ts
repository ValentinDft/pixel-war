import { Component } from '@angular/core';
import { Home } from './features/home/home';

@Component({
  selector: 'pix-root',
  imports: [Home],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
