import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { I18nService } from '../i18n/i18n.service';
import { NotificationService } from './notification.service';

function problemMessage(error: HttpErrorResponse, fallback: string): string {
  const body = error.error as { detail?: string; title?: string; errors?: Record<string, string[]> } | string | null;

  if (!body) {
    return error.message || fallback;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (body.detail) {
    return body.detail;
  }

  if (body.errors) {
    const first = Object.values(body.errors).flat()[0];
    if (first) {
      return first;
    }
  }

  return body.title || error.message || fallback;
}

export const notificationInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  const i18n = inject(I18nService);

  return next(req).pipe(
    tap({
      next: (event) => {
        if (!(event instanceof HttpResponse)) {
          return;
        }

        if (req.method === 'POST' && req.url.includes('/api/work-items')) {
          notifications.success(i18n.t('notifyCreated'));
          return;
        }

        if (req.method === 'PATCH' && req.url.includes('/api/work-items')) {
          notifications.success(i18n.t('notifyStatusUpdated'));
        }
      },
      error: (error: unknown) => {
        if (!(error instanceof HttpErrorResponse)) {
          return;
        }

        // list GETs already have an in-page error state — skip noisy toasts there
        if (req.method === 'GET') {
          return;
        }

        notifications.error(problemMessage(error, i18n.t('notifyError')));
      },
    }),
  );
};
