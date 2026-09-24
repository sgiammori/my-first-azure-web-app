import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification {
  @Input('count')
  notCount: number = 0;
}
