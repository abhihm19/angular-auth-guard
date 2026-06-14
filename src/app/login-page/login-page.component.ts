import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SigninForm } from '../model/signin';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent {
  invalidCredentials = false;

  signinForm = new FormGroup({
    username: new FormControl('', [
      Validators.required
    ]),
    password: new FormControl('', [
      Validators.required
      // Validators.minLength(8),
      // Validators.pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/)
    ])
  });

  constructor(private router: Router, 
              private authService: AuthService
  ) {}

  onSubmit() {
    const user = this.signinForm.value as SigninForm;

    this.authService.login(user).subscribe({
      next: () => {
        this.invalidCredentials = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.invalidCredentials = true;
      }
    });
  }
}
