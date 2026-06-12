import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'] // Reuses login styles or custom ones
})
export class RegisterComponent {
  userData = {
    name: '',
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
    if (!this.userData.name || !this.userData.email || !this.userData.password) {
      this.errorMsg = 'Please fill in all fields.';
      return;
    }

    if (this.userData.password.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';

    this.authService.register(this.userData).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg = res.message || 'Registration failed.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.error?.message || 'Something went wrong. Please try again.';
      }
    });
  }
}
