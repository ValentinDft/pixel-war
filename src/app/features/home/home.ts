import { Component } from '@angular/core';
import { Header } from '../components/header/header';

@Component({
  selector: 'pix-home',
  imports: [Header],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
