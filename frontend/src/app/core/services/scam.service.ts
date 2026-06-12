import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ScamService {
  private apiUrl = 'http://localhost:3000/api/scams';
  private statsUrl = 'http://localhost:3000/api/stats';
  private whatsappUrl = 'http://localhost:3000/api/whatsapp';

  constructor(private http: HttpClient, private authService: AuthService) {}

  checkScam(query: string, type: string): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/check`, { query, type }, { headers });
  }

  reportScam(reportData: any): Observable<any> {
    const headers = this.authService.getHeaders();
    // Use reported route depending on whether user is logged in
    const route = this.authService.isAuthenticated() ? `${this.apiUrl}/report` : `${this.apiUrl}/report-public`;
    return this.http.post<any>(route, reportData, { headers });
  }

  getRecentScams(page = 1, limit = 10, type = ''): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/recent?page=${page}&limit=${limit}&type=${type}`);
  }

  upvoteScam(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/upvote/${id}`, {});
  }

  getStats(): Observable<any> {
    return this.http.get<any>(this.statsUrl);
  }

  subscribeWhatsApp(phone: string, categories: string[]): Observable<any> {
    return this.http.post<any>(`${this.whatsappUrl}/subscribe`, { phone, categories });
  }
}
