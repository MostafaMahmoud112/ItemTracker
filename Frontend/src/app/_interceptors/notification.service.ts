import { Injectable, signal } from '@angular/core';

export type NotificationTone = 'success' | 'error';

export interface AppNotification {
  tone: NotificationTone;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly current = signal<AppNotification | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  dismiss(): void {
    this.current.set(null);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private show(tone: NotificationTone, message: string): void {
    this.dismiss();
    this.current.set({ tone, message });
    this.timer = setTimeout(() => this.dismiss(), 4000);
  }
}
