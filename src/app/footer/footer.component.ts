import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {

  currentYear = new Date().getFullYear();

  // Update these when you release a new version
  releaseDate = 'June 14, 2026';
  version = '1.0.0';
}
