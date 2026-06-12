import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit {
  billingPeriod: 'monthly' | 'lifetime' = 'monthly';
  currentUser: any = null;

  // Upgrade form state
  selectedPlan: 'plus' | 'business' | null = null;
  paymentMethod: 'easypaisa' | 'jazzcash' = 'easypaisa';
  transactionId: string = '';
  screenshotBase64: string = '';
  isSubmittingProof = false;
  submissionSuccess = '';
  submissionError = '';

  faqs = [
    {
      question: 'What is Shield Plus?',
      answer: 'Shield Plus is our premium personal digital protection plan. It gives you unlimited real-time scam checks, instant WhatsApp alert notifications for newly reported local scams, and exclusive safety badges on your public profile.',
      open: false
    },
    {
      question: 'How does the verification badge work?',
      answer: 'Once you subscribe, your profile will display a verified trust badge. This helps establish credibility when you interact within the fraudradar reporting community or file check reports.',
      open: false
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'Yes! You can cancel your monthly subscription at any time with a single click in your account dashboard. For the lifetime plan, you get one-time billing with no recurring charges.',
      open: false
    },
    {
      question: 'Is my data shared with anyone?',
      answer: 'Never. Your personal information, check records, and logs are encrypted locally and are not shared with third-party advertising services or analytics platforms.',
      open: false
    }
  ];

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleBilling(period: 'monthly' | 'lifetime') {
    this.billingPeriod = period;
  }

  toggleFaq(index: number) {
    this.faqs[index].open = !this.faqs[index].open;
  }

  // Upgrade Flow
  selectPlan(plan: 'plus' | 'business') {
    if (!this.currentUser) {
      this.router.navigate(['/auth/login'], { queryParams: { redirect: 'pricing' } });
      return;
    }
    this.selectedPlan = plan;
    this.submissionSuccess = '';
    this.submissionError = '';
    this.transactionId = '';
    this.screenshotBase64 = '';
  }

  closeForm() {
    this.selectedPlan = null;
  }

  getAmount(): number {
    if (this.selectedPlan === 'plus') {
      return this.billingPeriod === 'monthly' ? 199 : 1499;
    } else if (this.selectedPlan === 'business') {
      return this.billingPeriod === 'monthly' ? 999 : 7999;
    }
    return 0;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.submissionError = 'File size should not exceed 5MB.';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.screenshotBase64 = e.target.result;
        this.submissionError = '';
      };
      reader.readAsDataURL(file);
    }
  }

  submitProof() {
    if (!this.transactionId.trim()) {
      this.submissionError = 'Please enter the transaction ID.';
      return;
    }
    if (!this.screenshotBase64) {
      this.submissionError = 'Please upload a receipt screenshot.';
      return;
    }

    this.isSubmittingProof = true;
    this.submissionSuccess = '';
    this.submissionError = '';

    const proofData = {
      plan: this.selectedPlan!,
      amount: this.getAmount(),
      payment_method: this.paymentMethod,
      transaction_id: this.transactionId,
      screenshot: this.screenshotBase64
    };

    this.paymentService.submitProof(proofData).subscribe({
      next: (res) => {
        this.isSubmittingProof = false;
        if (res.success) {
          this.submissionSuccess = res.message;
          // Clear form after delay
          setTimeout(() => {
            this.selectedPlan = null;
          }, 3500);
        } else {
          this.submissionError = res.message;
        }
      },
      error: (err) => {
        this.isSubmittingProof = false;
        this.submissionError = err.error?.message || 'Failed to submit payment proof. Please try again.';
      }
    });
  }
}
