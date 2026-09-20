import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PagedResult, WorkItem, WorkItemStatus } from '../models/work-item.model';
import { WorkItemService } from '../services/work-item.service';

export type ListViewState =
  | { kind: 'loading' }
  | { kind: 'success'; result: PagedResult<WorkItem>; filtersActive: boolean }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-work-items',
  imports: [ReactiveFormsModule, AsyncPipe, DatePipe],
  templateUrl: './work-items.html',
  styleUrl: './work-items.scss',
})
export class WorkItemsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workItemsApi = inject(WorkItemService);
  private readonly destroyRef = inject(DestroyRef);

  readonly titleMaxLength = 120;
  readonly pageSize = 10;

  readonly createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(this.titleMaxLength)]],
    description: [''],
  });

  readonly searchControl = this.fb.nonNullable.control('');
  readonly statusControl = this.fb.nonNullable.control<'All' | WorkItemStatus>('All');

  private readonly page$ = new BehaviorSubject<number>(1);
  private readonly refresh$ = new BehaviorSubject<number>(0);

  readonly listState$: Observable<ListViewState> = combineLatest([
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      // Emit the current value immediately; only subsequent keystrokes are debounced.
      startWith(this.searchControl.value),
      tap(() => this.page$.next(1)),
    ),
    this.statusControl.valueChanges.pipe(
      distinctUntilChanged(),
      startWith(this.statusControl.value),
      tap(() => this.page$.next(1)),
    ),
    this.page$,
    this.refresh$,
  ]).pipe(
    // switchMap cancels the previous in-flight list request whenever search/status/page/refresh
    // changes, so a slower older response can never overwrite a newer one (stale protection).
    switchMap(([search, status, page]) => {
      const statusFilter = status === 'All' ? null : status;
      const filtersActive = Boolean(search.trim()) || statusFilter !== null;

      return this.workItemsApi
        .getWorkItems({
          search,
          status: statusFilter,
          page,
          pageSize: this.pageSize,
        })
        .pipe(
          map(
            (result): ListViewState => ({
              kind: 'success',
              result,
              filtersActive,
            }),
          ),
          startWith({ kind: 'loading' } satisfies ListViewState),
          catchError((error: Error) =>
            of({ kind: 'error', message: error.message } satisfies ListViewState),
          ),
        );
    }),
  );

  createError: string | null = null;
  actionError: string | null = null;
  submitting = false;
  readonly advancingIds = new Set<number>();

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.page$.complete();
      this.refresh$.complete();
    });
  }

  get titleControl() {
    return this.createForm.controls.title;
  }

  get remainingTitleChars(): number {
    return this.titleMaxLength - (this.titleControl.value?.length ?? 0);
  }

  isAdvancing(id: number): boolean {
    return this.advancingIds.has(id);
  }

  actionLabel(status: WorkItemStatus): string | null {
    switch (status) {
      case 'Todo':
        return 'Start';
      case 'InProgress':
        return 'Complete';
      default:
        return null;
    }
  }

  onSubmit(): void {
    this.createError = null;
    this.createForm.markAllAsTouched();

    if (this.createForm.invalid || this.submitting) {
      return;
    }

    const { title, description } = this.createForm.getRawValue();
    this.submitting = true;

    this.workItemsApi
      .createWorkItem({
        title,
        description: description.trim() ? description : null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.submitting = false;
        }),
      )
      .subscribe({
        next: () => {
          this.createForm.reset({ title: '', description: '' });
          this.refreshList();
        },
        error: (error: Error) => {
          this.createError = error.message;
        },
      });
  }

  onAdvance(item: WorkItem): void {
    const nextStatus: WorkItemStatus | null =
      item.status === 'Todo' ? 'InProgress' : item.status === 'InProgress' ? 'Done' : null;

    if (!nextStatus || this.advancingIds.has(item.id)) {
      return;
    }

    this.actionError = null;
    this.advancingIds.add(item.id);

    this.workItemsApi
      .updateStatus(item.id, nextStatus)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.advancingIds.delete(item.id);
        }),
      )
      .subscribe({
        next: () => this.refreshList(),
        error: (error: Error & { status?: number }) => {
          if (error.status === 409 || error.status === 404) {
            this.actionError = error.message;
            this.refreshList();
            return;
          }

          this.actionError = error.message;
        },
      });
  }

  goToPreviousPage(): void {
    if (this.page$.value <= 1) {
      return;
    }
    this.page$.next(this.page$.value - 1);
  }

  goToNextPage(totalPages: number): void {
    if (this.page$.value >= totalPages) {
      return;
    }
    this.page$.next(this.page$.value + 1);
  }

  retry(): void {
    this.refreshList();
  }

  refreshList(): void {
    this.refresh$.next(this.refresh$.value + 1);
  }

  trackById(_index: number, item: WorkItem): number {
    return item.id;
  }

  statusClass(status: WorkItemStatus): string {
    return `badge badge--${status.toLowerCase()}`;
  }
}
