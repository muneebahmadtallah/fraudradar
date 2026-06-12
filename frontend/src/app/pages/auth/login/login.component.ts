import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  isLoading = false;
  errorMsg = '';

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMsg = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';

    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg = res.message || 'Login failed.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || 'Something went wrong. Please try again.';
      }
    });
  }
}
