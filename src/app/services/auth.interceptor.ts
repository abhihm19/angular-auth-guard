import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Attaches the access token to every outgoing request and transparently
 * recovers from expired access tokens:
 *
 *   request → 401 → POST /refresh-token → retry request with new token
 *                          ↓ (refresh fails or retry fails again)
 *                    clear tokens + redirect to /login
 *
 * Auth endpoints (login/signup/refresh/logout) are excluded — a 401 there
 * must not trigger another refresh (infinite loop).
 *
 * Concurrency: the backend ROTATES refresh tokens (single use). If several
 * requests hit 401 at once, only the first may call /refresh-token; the rest
 * wait for its result and retry with the new access token.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private refreshInProgress = false;
  /** Emits the new access token after a successful refresh; null while refreshing. */
  private refreshResult$ = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(this.withToken(request)).pipe(
      catchError((error) => {
        const shouldTryRefresh =
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          !this.isAuthEndpoint(request.url) &&
          this.authService.getRefreshToken() !== null;

        if (shouldTryRefresh) {
          return this.refreshThenRetry(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  /** Clones the request with the CURRENT access token (important for retries). */
  private withToken(request: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.authService.getAccessToken();
    if (!token) {
      return request;
    }
    return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/v1/');
  }

  private refreshThenRetry(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.refreshInProgress) {
      this.refreshInProgress = true;
      this.refreshResult$.next(null);

      return this.authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          this.refreshInProgress = false;
          this.refreshResult$.next(newAccessToken);
          return next.handle(this.withToken(request));
        }),
        catchError((error) => {
          this.refreshInProgress = false;
          return this.redirectToLogin(error);
        })
      );
    }

    // A refresh is already running — wait for it, then retry with the new token
    return this.refreshResult$.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(() => next.handle(this.withToken(request))),
      catchError((error) => {
        // Retried request failed with 401 again → session is truly dead
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.redirectToLogin(error);
        }
        return throwError(() => error);
      })
    );
  }

  private redirectToLogin(error: unknown): Observable<never> {
    this.authService.clearTokens();
    this.router.navigate(['/login'], { replaceUrl: true });
    return throwError(() => error);
  }
}
