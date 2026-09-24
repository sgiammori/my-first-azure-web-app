import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-jumbotron',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './jumbotron.html',
  styleUrl: './jumbotron.css',
})
export class Jumbotron {
  @Input()
  Titolo: string = "";
  @Input()
  SottoTitolo: string = "";
  @Input()
  Show: boolean = true;
}
