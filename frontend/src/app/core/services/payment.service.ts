import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = '/api/payments';

  constructor(private http: HttpClient, private authService: AuthService) {}

  submitProof(proofData: {
    plan: string;
    amount: number;
    payment_method: 'easypaisa' | 'jazzcash';
    transaction_id: string;
    screenshot: string;
  }): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/submit`, proofData, { headers });
  }

  getAdminPayments(): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/admin/all`, { headers });
  }

  verifyPayment(paymentId: string, status: 'approved' | 'rejected'): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/admin/verify`, { paymentId, status }, { headers });
  }
}
