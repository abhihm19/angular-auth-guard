import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { SigninForm } from '../model/signin';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  authorities?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/auth-server/api/auth/v1';
  private readonly authTokenKey = 'authToken';
  private readonly refreshTokenKey = 'refreshToken';

  constructor(private http: HttpClient) { }

  login(credentials: SigninForm): Observable<void> {
    this.clearTokens();

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      map((response) => {
        this.storeTokens(response);
      })
    );
  }

  /**
   * Exchanges the stored refresh token for a new token pair.
   * The backend rotates the refresh token, so both tokens are replaced.
   * Emits the new access token; errors if the refresh token is invalid/expired.
   */
  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getRefreshToken() ?? '';
    const headers = new HttpHeaders({ 'Refresh-Token': refreshToken });

    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh-token`, {}, { headers }).pipe(
      map((response) => {
        this.storeTokens(response);
        return response.accessToken;
      })
    );
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  hasRole(role: string): boolean {
    const token = this.getAccessToken();

    if (!token) {
      return false;
    }

    const payload = this.decodeJwtPayload(token);
    return payload?.authorities?.includes(role) ?? false;
  }

  getAuthHeaders(): HttpHeaders {
    const authToken = this.getAccessToken() ?? '';

    return new HttpHeaders({
      Authorization: `Bearer ${authToken}`
    });
  }

  logout(): Observable<void> {
    const refreshToken = sessionStorage.getItem(this.refreshTokenKey) ?? '';
    const headers = this.getAuthHeaders().set('Refresh-Token', refreshToken);

    return this.http.post<void>(`${this.baseUrl}/logout`, {}, { headers }).pipe(
      finalize(() => this.clearTokens())
    );
  }

  clearTokens() {
    sessionStorage.removeItem(this.authTokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.authTokenKey);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.refreshTokenKey);
  }

  private storeTokens(response: LoginResponse) {
    sessionStorage.setItem(this.authTokenKey, response.accessToken);
    sessionStorage.setItem(this.refreshTokenKey, response.refreshToken);
  }

  private decodeJwtPayload(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const decodedPayload = atob(normalizedPayload);

      return JSON.parse(decodedPayload) as JwtPayload;
    } catch {
      return null;
    }
  }
}
