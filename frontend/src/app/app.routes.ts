import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PricingComponent } from './pages/pricing/pricing.component';
import { WhatsappAlertsComponent } from './pages/whatsapp-alerts/whatsapp-alerts.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminPaymentsComponent } from './pages/admin/admin-payments/admin-payments.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'pricing', component: PricingComponent },
  { path: 'whatsapp-alerts', component: WhatsappAlertsComponent },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
  { path: 'admin/payments', component: AdminPaymentsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];
