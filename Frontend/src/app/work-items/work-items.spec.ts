import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { PagedResult, WorkItem } from '../models/work-item.model';
import { WorkItemService } from '../services/work-item.service';
import { WorkItemsComponent } from './work-items';

function pageOf(items: WorkItem[], totalCount = items.length): PagedResult<WorkItem> {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalCount,
    totalPages: totalCount === 0 ? 0 : 1,
  };
}

function item(partial: Partial<WorkItem> & Pick<WorkItem, 'id' | 'title' | 'status'>): WorkItem {
  return {
    description: null,
    createdAt: '2026-09-20T12:00:00Z',
    ...partial,
  };
}

describe('WorkItemsComponent', () => {
  let fixture: ComponentFixture<WorkItemsComponent>;
  let component: WorkItemsComponent;
  let getWorkItems: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getWorkItems = vi.fn(() => of(pageOf([])));

    await TestBed.configureTestingModule({
      imports: [WorkItemsComponent],
      providers: [
        {
          provide: WorkItemService,
          useValue: {
            getWorkItems,
            createWorkItem: vi.fn(),
            updateStatus: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkItemsComponent);
    component = fixture.componentInstance;
  });

  it('ignores a slower stale list response when a newer query finishes first', async () => {
    const slowItems = [item({ id: 1, title: 'Slow Result', status: 'Todo' })];
    const fastItems = [item({ id: 2, title: 'Fast Result', status: 'Todo' })];

    getWorkItems.mockImplementation(
      (query: { search?: string }): Observable<PagedResult<WorkItem>> => {
        if (query.search === 'alpha') {
          return timer(200).pipe(map(() => pageOf(slowItems)));
        }

        if (query.search === 'beta') {
          return of(pageOf(fastItems));
        }

        return of(pageOf([]));
      },
    );

    fixture.detectChanges();
    await fixture.whenStable();

    component.searchControl.setValue('alpha');
    await delay(320);

    component.searchControl.setValue('beta');
    await delay(320);
    await delay(250);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Fast Result');
    expect(text).not.toContain('Slow Result');
  });

  it('renders loading, empty, and error states', async () => {
    getWorkItems.mockReturnValue(timer(10_000).pipe(map(() => pageOf([]))));

    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading work items');

    getWorkItems.mockReturnValue(of(pageOf([])));
    component.retry();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No items yet');

    getWorkItems.mockReturnValue(of(pageOf([], 0)));
    component.searchControl.setValue('missing');
    await delay(320);
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No results for your filters',
    );

    getWorkItems.mockReturnValue(throwError(() => new Error('Network down')));
    component.retry();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Network down');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Retry');
  });

  it('shows the correct action label for each status', async () => {
    expect(component.actionLabel('Todo')).toBe('Start');
    expect(component.actionLabel('InProgress')).toBe('Complete');
    expect(component.actionLabel('Done')).toBeNull();

    getWorkItems.mockReturnValue(
      of(
        pageOf([
          item({ id: 1, title: 'A', status: 'Todo' }),
          item({ id: 2, title: 'B', status: 'InProgress' }),
          item({ id: 3, title: 'C', status: 'Done' }),
        ]),
      ),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = fixture.debugElement
      .queryAll(By.css('.item__actions .btn'))
      .map((button) => (button.nativeElement as HTMLButtonElement).textContent?.trim());

    expect(buttons).toEqual(['Start', 'Complete', 'Done']);
    expect(
      (
        fixture.debugElement.queryAll(By.css('.item__actions .btn'))[2]
          .nativeElement as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
