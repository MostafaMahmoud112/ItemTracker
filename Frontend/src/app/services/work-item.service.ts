import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CreateWorkItemRequest,
  PagedResult,
  ProblemDetails,
  UpdateWorkItemStatusRequest,
  WorkItem,
  WorkItemListQuery,
  WorkItemStatus,
} from '../models/work-item.model';

@Injectable({ providedIn: 'root' })
export class WorkItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/work-items';

  getWorkItems(query: WorkItemListQuery): Observable<PagedResult<WorkItem>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('pageSize', String(query.pageSize ?? 10));

    const search = query.search?.trim();
    if (search) {
      params = params.set('search', search);
    }

    if (query.status) {
      params = params.set('status', query.status);
    }

    return this.http
      .get<PagedResult<WorkItem>>(this.baseUrl, { params })
      .pipe(catchError((error) => throwError(() => this.toApiError(error))));
  }

  createWorkItem(request: CreateWorkItemRequest): Observable<WorkItem> {
    return this.http
      .post<WorkItem>(this.baseUrl, request)
      .pipe(catchError((error) => throwError(() => this.toApiError(error))));
  }

  updateStatus(id: number, status: WorkItemStatus): Observable<WorkItem> {
    const body: UpdateWorkItemStatusRequest = { status };
    return this.http
      .patch<WorkItem>(`${this.baseUrl}/${id}/status`, body)
      .pipe(catchError((error) => throwError(() => this.toApiError(error))));
  }

  private toApiError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const problem = error.error as ProblemDetails | string | null;
      const message = this.extractProblemMessage(problem) ?? error.message ?? 'Request failed.';
      const apiError = new Error(message);
      (apiError as Error & { status?: number }).status = error.status;
      return apiError;
    }

    return error instanceof Error ? error : new Error('Unexpected error.');
  }

  private extractProblemMessage(problem: ProblemDetails | string | null): string | null {
    if (!problem) {
      return null;
    }

    if (typeof problem === 'string') {
      return problem;
    }

    if (problem.detail) {
      return problem.detail;
    }

    if (problem.errors) {
      const first = Object.values(problem.errors).flat()[0];
      if (first) {
        return first;
      }
    }

    return problem.title ?? null;
  }
}
