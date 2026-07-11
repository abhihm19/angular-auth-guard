import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Logs the user out after a period of no user activity.
 *
 * Any mouse/keyboard/scroll/touch event resets the countdown. When it fires
 * and the user is logged in, we revoke the session on the backend and
 * redirect to the login screen.
 *
 * Activity listeners run outside Angular's zone so that mouse moves don't
 * trigger change detection on every pixel.
 */
@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {

  /** Log out after this much inactivity. */
  private readonly timeoutMs = 0.5 * 60 * 1000;

  private readonly activityEvents = ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'];
  private readonly onActivity = () => this.resetTimer();
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private watching = false;

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private authService: AuthService
  ) {}

  startWatching() {
    if (this.watching) {
      return;
    }
    this.watching = true;

    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach((eventName) =>
        document.addEventListener(eventName, this.onActivity, true));
      this.resetTimer();
    });
  }

  stopWatching() {
    this.watching = false;
    this.activityEvents.forEach((eventName) =>
      document.removeEventListener(eventName, this.onActivity, true));
    this.clearTimer();
  }

  ngOnDestroy() {
    this.stopWatching();
  }

  private resetTimer() {
    this.clearTimer();
    this.timerId = setTimeout(() => this.onInactivityTimeout(), this.timeoutMs);
  }

  private clearTimer() {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private onInactivityTimeout() {
    // Not logged in (e.g. sitting on the login screen) — nothing to do,
    // just keep watching for the next session.
    if (!this.authService.isLoggedIn()) {
      this.resetTimer();
      return;
    }

    // setTimeout fired outside Angular's zone — re-enter it so the router
    // navigation and view updates are picked up by change detection.
    this.ngZone.run(() => {
      const redirect = () =>
        this.router.navigate(['/login'], { replaceUrl: true, queryParams: { reason: 'inactivity' } });

      // Best effort: revoke the session server-side too. If that call fails
      // (e.g. tokens already expired), still clear locally and redirect.
      this.authService.logout().subscribe({
        next: redirect,
        error: () => {
          this.authService.clearTokens();
          redirect();
        }
      });
    });

    this.resetTimer();
  }
}
