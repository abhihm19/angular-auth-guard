import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface AdminHelloResponse {
  message: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  message = '';
  loading = true;
  errorMessage = '';

  constructor(private http: HttpClient) {
    this.loadAdminMessage();
  }

  private loadAdminMessage() {
    // Authorization header is attached by AuthInterceptor
    this.http.get<AdminHelloResponse>('http://localhost:8080/auth-server/api/admin/hello').subscribe({
      next: (response) => {
        this.message = response.message;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load admin message.';
        this.loading = false;
      }
    });
  }
}
