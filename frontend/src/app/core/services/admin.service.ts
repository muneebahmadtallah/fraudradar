import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getReports(): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/reports`, { headers });
  }

  addScam(scamData: any): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.post<any>(`${this.apiUrl}/scams`, scamData, { headers });
  }

  updateReport(id: string, updateData: any): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.put<any>(`${this.apiUrl}/reports/${id}`, updateData, { headers });
  }

  deleteScam(id: string): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.delete<any>(`${this.apiUrl}/scams/${id}`, { headers });
  }

  getSubscribers(): Observable<any> {
    const headers = this.authService.getHeaders();
    return this.http.get<any>(`${this.apiUrl}/subscribers`, { headers });
  }
}
