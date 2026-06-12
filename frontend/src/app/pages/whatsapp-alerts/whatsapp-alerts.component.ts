import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ScamService } from '../../core/services/scam.service';

@Component({
  selector: 'app-whatsapp-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './whatsapp-alerts.component.html',
  styleUrls: ['./whatsapp-alerts.component.scss']
})
export class WhatsappAlertsComponent {
  phone: string = '';
  
  categories = [
    { id: 'all', label: 'All Scams', desc: 'Get notified about all types of scams', checked: true },
    { id: 'phone', label: 'Phone Scams', desc: 'Fraudulent calls and SMS phishing', checked: false },
    { id: 'link', label: 'Link/Profile Scams', desc: 'Fake social media profiles and phishing links', checked: false },
    { id: 'message', label: 'Message Scams', desc: 'Suspicious messages and texts', checked: false }
  ];

  isSubmitting: boolean = false;
  status: { success: boolean; message: string } | null = null;

  constructor(private scamService: ScamService) {}

  toggleCategory(id: string) {
    if (id === 'all') {
      const allState = !this.categories[0].checked;
      this.categories.forEach(c => c.checked = allState);
    } else {
      const target = this.categories.find(c => c.id === id);
      if (target) {
        target.checked = !target.checked;
      }
      
      // If any specific category is unchecked, 'all' is unchecked
      // If all specific categories are checked, 'all' is checked
      const specifics = this.categories.slice(1);
      const allChecked = specifics.every(c => c.checked);
      this.categories[0].checked = allChecked;
    }
  }

  onSubmit() {
    if (!this.phone.trim()) {
      this.status = { success: false, message: 'Please enter your WhatsApp number.' };
      return;
    }

    const selectedCats = this.categories
      .filter(c => c.checked)
      .map(c => c.id);

    if (selectedCats.length === 0) {
      this.status = { success: false, message: 'Please select at least one alert category.' };
      return;
    }

    this.isSubmitting = true;
    this.status = null;

    const formattedPhone = `92${this.phone.replace(/^0+/, '')}`;

    this.scamService.subscribeWhatsApp(formattedPhone, selectedCats).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.status = { success: true, message: res.message };
          this.phone = '';
        } else {
          this.status = { success: false, message: res.message };
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.status = { success: false, message: err.error?.message || 'Subscription failed. Please try again.' };
      }
    });
  }
}
