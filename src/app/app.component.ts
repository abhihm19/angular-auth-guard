import { Component } from '@angular/core';
import { InactivityService } from './services/inactivity.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'auth-guard';

  constructor(inactivityService: InactivityService) {
    inactivityService.startWatching();
  }
}
