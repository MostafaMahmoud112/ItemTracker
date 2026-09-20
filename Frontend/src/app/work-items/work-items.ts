import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
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
import { IconComponent } from '../icons/icon';
import { I18nService, TranslationKey } from '../i18n/i18n.service';
import { TranslatePipe } from '../i18n/translate.pipe';
import { PagedResult, WorkItem, WorkItemStatus } from '../models/work-item.model';
import { WorkItemService } from '../services/work-item.service';
import { ThemeService } from '../theme/theme.service';
import { NotificationService } from '../_interceptors/notification.service';

export type ListViewState =
  | { kind: 'loading' }
  | { kind: 'success'; result: PagedResult<WorkItem>; filtersActive: boolean }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-work-items',
  imports: [ReactiveFormsModule, AsyncPipe, IconComponent, TranslatePipe],
  templateUrl: './work-items.html',
  styleUrl: './work-items.scss',
})
export class WorkItemsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly workItemsApi = inject(WorkItemService);
  private readonly destroyRef = inject(DestroyRef);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly notifications = inject(NotificationService);

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;

  createPanelOpen = true;

  readonly titleMaxLength = 120;
  readonly pageSize = 10;
  readonly statusOptions: Array<{ value: 'All' | WorkItemStatus; labelKey: TranslationKey }> = [
    { value: 'All', labelKey: 'statusAll' },
    { value: 'Todo', labelKey: 'statusTodo' },
    { value: 'InProgress', labelKey: 'statusInProgress' },
    { value: 'Done', labelKey: 'statusDone' },
  ];

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
      // startWith so the first load doesn't wait on the debounce; only typing is delayed.
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
    // switchMap cancels the in-flight list call when filters change, so an older
    // slow response can't overwrite what the user just asked for.
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

  submitting = false;
  readonly advancingIds = new Set<number>();

  constructor() {
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

  get titleCounterTone(): 'ok' | 'warn' | 'danger' {
    const remaining = this.remainingTitleChars;
    if (remaining <= 10) {
      return 'danger';
    }
    if (remaining <= 30) {
      return 'warn';
    }
    return 'ok';
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

  actionLabelKey(status: WorkItemStatus): TranslationKey | null {
    switch (status) {
      case 'Todo':
        return 'start';
      case 'InProgress':
        return 'complete';
      default:
        return null;
    }
  }

  statusLabelKey(status: WorkItemStatus): TranslationKey {
    switch (status) {
      case 'Todo':
        return 'statusTodo';
      case 'InProgress':
        return 'statusInProgress';
      case 'Done':
        return 'statusDone';
    }
  }

  progressStep(status: WorkItemStatus): number {
    switch (status) {
      case 'Todo':
        return 1;
      case 'InProgress':
        return 2;
      case 'Done':
        return 3;
    }
  }

  formatCreatedAt(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }

    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) {
      return this.i18n.t('justNow');
    }
    if (mins < 60) {
      return this.i18n.t('minutesAgo', { n: mins });
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return this.i18n.t('hoursAgo', { n: hours });
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return this.i18n.t('daysAgo', { n: days });
    }

    return date.toLocaleDateString(this.i18n.locale() === 'ar' ? 'ar' : 'en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  onSubmit(): void {
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
        error: () => {
          // server errors are surfaced by the notification interceptor
        },
      });
  }

  onAdvance(item: WorkItem): void {
    const nextStatus: WorkItemStatus | null =
      item.status === 'Todo' ? 'InProgress' : item.status === 'InProgress' ? 'Done' : null;

    if (!nextStatus || this.advancingIds.has(item.id)) {
      return;
    }

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
            this.refreshList();
          }
        },
      });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusControl.setValue('All');
  }

  focusTitleInput(): void {
    this.openCreatePanel();
  }

  openCreatePanel(): void {
    this.createPanelOpen = true;
    queueMicrotask(() => this.titleInput?.nativeElement.focus());
  }

  closeCreatePanel(): void {
    this.createPanelOpen = false;
    this.createForm.reset({ title: '', description: '' });
  }

  setStatus(value: 'All' | WorkItemStatus): void {
    this.statusControl.setValue(value);
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

  statusClass(status: WorkItemStatus): string {
    return `badge badge--${status.toLowerCase()}`;
  }
}
