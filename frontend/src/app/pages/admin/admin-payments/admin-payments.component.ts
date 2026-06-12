import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-payments.component.html',
  styleUrls: ['./admin-payments.component.scss']
})
export class AdminPaymentsComponent implements OnInit {
  payments: any[] = [];
  filteredPayments: any[] = [];
  isLoading = false;
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

  // Screenshot modal preview
  previewScreenshot: string | null = null;

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (!user || user.role !== 'admin') {
      this.router.navigate(['/']);
      return;
    }
    this.loadPayments();
  }

  loadPayments() {
    this.isLoading = true;
    this.paymentService.getAdminPayments().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.payments = res.data;
          this.applyFilter();
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load payments', err);
      }
    });
  }

  applyFilter() {
    if (this.statusFilter === 'all') {
      this.filteredPayments = this.payments;
    } else {
      this.filteredPayments = this.payments.filter(p => p.status === this.statusFilter);
    }
  }

  setFilter(filter: 'all' | 'pending' | 'approved' | 'rejected') {
    this.statusFilter = filter;
    this.applyFilter();
  }

  getCountByStatus(status: string): number {
    return this.payments.filter(p => p.status === status).length;
  }

  openPreview(screenshotUrl: string) {
    this.previewScreenshot = screenshotUrl;
  }

  closePreview() {
    this.previewScreenshot = null;
  }

  verify(paymentId: string, status: 'approved' | 'rejected') {
    if (!confirm(`Are you sure you want to ${status} this payment proof?`)) return;

    this.paymentService.verifyPayment(paymentId, status).subscribe({
      next: (res) => {
        if (res.success) {
          const index = this.payments.findIndex(p => p.id === paymentId);
          if (index !== -1) {
            this.payments[index].status = status;
            
            // If the user being approved is the current logged-in user, sync plan locally
            const currentUser = this.authService.currentUserValue;
            if (currentUser && currentUser.id === this.payments[index].user_id && status === 'approved') {
              this.authService.updatePlan(this.payments[index].plan);
            }
          }
          this.applyFilter();
        }
      },
      error: (err) => {
        console.error('Failed to verify payment', err);
        alert(err.error?.message || 'Error occurred during verification.');
      }
    });
  }
}
