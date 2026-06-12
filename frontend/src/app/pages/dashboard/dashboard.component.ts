import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ScamService } from '../../core/services/scam.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  activeTab: 'check' | 'report' | 'recent' | 'safe' = 'check';
  user: any = null;

  // Check form
  checkType: 'phone' | 'link' | 'message' = 'phone';
  checkQuery: string = '';
  isChecking: boolean = false;
  checkResult: any = null;

  // Report form
  reportType: string = 'phone';
  reportIdentifier: string = '';
  reportDescription: string = '';
  isReporting: boolean = false;
  reportStatus: { success: boolean; message: string } | null = null;

  // Recent scams list
  recentScams: any[] = [];
  recentLoading: boolean = false;
  recentPage: number = 1;
  recentPages: number = 1;
  recentTypeFilter: string = '';

  constructor(
    private authService: AuthService,
    private scamService: ScamService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
    this.loadRecentScams();
  }

  setTab(tab: 'check' | 'report' | 'recent' | 'safe') {
    this.activeTab = tab;
    this.checkResult = null;
    this.reportStatus = null;
    if (tab === 'recent') {
      this.loadRecentScams();
    }
  }

  // --- CHECK SCAM METODS ---
  onCheck() {
    if (!this.checkQuery.trim()) return;

    this.isChecking = true;
    this.checkResult = null;

    this.scamService.checkScam(this.checkQuery, this.checkType).subscribe({
      next: (res) => {
        this.isChecking = false;
        if (res.success) {
          this.checkResult = res.data;
        }
      },
      error: (err) => {
        this.isChecking = false;
        console.error(err);
        if (err.error?.limitExceeded) {
          alert(err.error.message);
          this.router.navigate(['/pricing']);
        } else {
          alert(err.error?.message || 'Failed to check scam details. Please try again.');
        }
      }
    });
  }

  clearCheck() {
    this.checkQuery = '';
    this.checkResult = null;
  }

  // --- REPORT SCAM METHODS ---
  onReport() {
    if (!this.reportIdentifier.trim()) {
      this.reportStatus = { success: false, message: 'Please enter the number, link or details to report.' };
      return;
    }

    this.isReporting = true;
    this.reportStatus = null;

    const reportData = {
      type: this.reportType,
      identifier: this.reportIdentifier,
      description: this.reportDescription
    };

    this.scamService.reportScam(reportData).subscribe({
      next: (res) => {
        this.isReporting = false;
        if (res.success) {
          this.reportStatus = { success: true, message: res.message };
          this.reportIdentifier = '';
          this.reportDescription = '';
          // Reload recent feed in background
          this.loadRecentScams();
        } else {
          this.reportStatus = { success: false, message: res.message };
        }
      },
      error: (err) => {
        this.isReporting = false;
        this.reportStatus = { 
          success: false, 
          message: err.error?.message || 'Failed to submit report. Please log in or try again.' 
        };
      }
    });
  }

  // --- RECENT SCAMS METHODS ---
  loadRecentScams(page = 1) {
    this.recentLoading = true;
    this.scamService.getRecentScams(page, 10, this.recentTypeFilter).subscribe({
      next: (res) => {
        this.recentLoading = false;
        if (res.success) {
          this.recentScams = res.data;
          this.recentPage = res.pagination.page;
          this.recentPages = res.pagination.pages;
        }
      },
      error: (err) => {
        this.recentLoading = false;
        console.error(err);
      }
    });
  }

  filterRecentByType(type: string) {
    this.recentTypeFilter = type;
    this.loadRecentScams(1);
  }

  upvoteScam(id: string) {
    this.scamService.upvoteScam(id).subscribe({
      next: (res) => {
        if (res.success) {
          const scam = this.recentScams.find(s => s.id === id);
          if (scam) scam.upvotes += 1;
        }
      }
    });
  }

  getVerdictClass(verdict: string): string {
    switch (verdict) {
      case 'danger': return 'risk-danger';
      case 'warning': return 'risk-warning';
      default: return 'risk-safe';
    }
  }

  getVerdictLabel(verdict: string): string {
    switch (verdict) {
      case 'danger': return 'High Risk Scam Detected!';
      case 'warning': return 'Suspicious activity pattern.';
      default: return 'No reports found / Low Risk';
    }
  }
}
