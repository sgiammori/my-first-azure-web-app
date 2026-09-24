import { Component, signal, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { Header } from './core/header/header';
import { Footer } from './core/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  title: string = 'Angular 17';

  constructor(private router: Router) {}

  ngAfterViewInit() {
    // Nessuna logica necessaria: la navbar è ora gestita da Angular
  }

}
