import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScamService } from '../../core/services/scam.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  stats: any = {
    total_protected: 10432,
    scams_blocked: 25891,
    reports_today: 47,
    accuracy_rate: 98.7
  };

  constructor(private scamService: ScamService) {}

  ngOnInit(): void {
    this.scamService.getStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.stats = res.data;
        }
      },
      error: (err) => console.error('Failed to load stats', err)
    });
  }
}
