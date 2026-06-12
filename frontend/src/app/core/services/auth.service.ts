import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (e) {
        this.logout();
      }
    }
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('currentUser', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  updatePlan(plan: string) {
    const user = this.currentUserValue;
    if (user) {
      user.plan = plan;
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
