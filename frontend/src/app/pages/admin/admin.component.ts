import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  activeTab: 'scam-manager' | 'reports-queue' | 'subscribers' = 'scam-manager';

  // Lists
  reports: any[] = [];
  subscribers: any[] = [];
  isLoading = false;

  // Queue filter
  queueFilter: 'all' | 'pending' | 'verified' = 'pending';

  // Add form model
  scamForm = {
    type: 'phone',
    identifier: '',
    description: '',
    risk_score: 90
  };
  formSuccess = '';
  formError = '';
  formSubmitting = false;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (!user || user.role !== 'admin') {
      this.router.navigate(['/']);
      return;
    }
    this.loadReports();
  }

  setTab(tab: 'scam-manager' | 'reports-queue' | 'subscribers') {
    this.activeTab = tab;
    if (tab === 'reports-queue') this.loadReports();
    if (tab === 'subscribers') this.loadSubscribers();
  }

  setQueueFilter(filter: 'all' | 'pending' | 'verified') {
    this.queueFilter = filter;
  }

  /** Filtered subset of reports for display */
  get filteredReports(): any[] {
    if (this.queueFilter === 'pending') {
      return this.reports.filter(r => r.verified !== 1);
    }
    if (this.queueFilter === 'verified') {
      return this.reports.filter(r => r.verified === 1);
    }
    return this.reports;
  }

  get pendingCount(): number {
    return this.reports.filter(r => r.verified !== 1).length;
  }

  get verifiedCount(): number {
    return this.reports.filter(r => r.verified === 1).length;
  }

  loadReports() {
    this.isLoading = true;
    this.adminService.getReports().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.reports = res.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load reports', err);
      }
    });
  }

  loadSubscribers() {
    this.isLoading = true;
    this.adminService.getSubscribers().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.subscribers = res.data;
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load subscribers', err);
      }
    });
  }

  // --- MANUAL SCAM ADDITION ---
  onAddScam() {
    if (!this.scamForm.identifier.trim()) {
      this.formError = 'Please fill out all required fields.';
      return;
    }

    this.formSubmitting = true;
    this.formSuccess = '';
    this.formError = '';

    this.adminService.addScam(this.scamForm).subscribe({
      next: (res) => {
        this.formSubmitting = false;
        if (res.success) {
          this.formSuccess = res.message || 'Scam entry injected and verified successfully.';
          this.scamForm.identifier = '';
          this.scamForm.description = '';
          this.scamForm.risk_score = 90;
          this.loadReports();
        } else {
          this.formError = res.message;
        }
      },
      error: (err) => {
        this.formSubmitting = false;
        this.formError = err.error?.message || 'Failed to add scam entry.';
      }
    });
  }

  // --- APPROVE PENDING REPORT ---
  verifyReport(id: string) {
    const updateData = {
      status: 'confirmed',
      verified: 1,
      risk_score: 90
    };

    this.adminService.updateReport(id, updateData).subscribe({
      next: (res) => {
        if (res.success) {
          // Optimistically update locally (no full reload flash)
          const idx = this.reports.findIndex(r => r.id === id);
          if (idx !== -1) {
            this.reports[idx].verified = 1;
            this.reports[idx].status = 'confirmed';
            this.reports[idx].risk_score = 90;
            // Trigger change detection
            this.reports = [...this.reports];
          }
        }
      },
      error: (err) => console.error('Failed to verify report', err)
    });
  }

  // --- DELETE REPORT ---
  deleteReport(id: string) {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;

    this.adminService.deleteScam(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.reports = this.reports.filter(r => r.id !== id);
        }
      },
      error: (err) => console.error('Failed to delete report', err)
    });
  }
}
