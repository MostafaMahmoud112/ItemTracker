import { Injectable, computed, signal } from '@angular/core';

export type AppLocale = 'en' | 'ar';

export type TranslationKey =
  | 'appTitle'
  | 'appTagline'
  | 'themeToLight'
  | 'themeToDark'
  | 'langToArabic'
  | 'langToEnglish'
  | 'createHeading'
  | 'title'
  | 'titlePlaceholder'
  | 'charsRemaining'
  | 'titleRequired'
  | 'titleMax'
  | 'description'
  | 'optional'
  | 'descriptionPlaceholder'
  | 'create'
  | 'creating'
  | 'itemsHeading'
  | 'search'
  | 'searchPlaceholder'
  | 'clearSearch'
  | 'statusFilter'
  | 'statusAll'
  | 'statusTodo'
  | 'statusInProgress'
  | 'statusDone'
  | 'loading'
  | 'retry'
  | 'emptyTitle'
  | 'emptyCopy'
  | 'emptyCta'
  | 'closeCreate'
  | 'openCreate'
  | 'noResultsTitle'
  | 'noResultsCopy'
  | 'clearFilters'
  | 'start'
  | 'complete'
  | 'done'
  | 'updating'
  | 'previous'
  | 'next'
  | 'pageOf'
  | 'total'
  | 'justNow'
  | 'minutesAgo'
  | 'hoursAgo'
  | 'daysAgo'
  | 'dismiss'
  | 'notifyCreated'
  | 'notifyStatusUpdated'
  | 'notifyError';

const EN: Record<TranslationKey, string> = {
  appTitle: 'Work Items',
  appTagline: 'Track tasks from Todo to Done.',
  themeToLight: 'Switch to light theme',
  themeToDark: 'Switch to dark theme',
  langToArabic: 'العربية',
  langToEnglish: 'English',
  createHeading: 'Create work item',
  title: 'Title',
  titlePlaceholder: 'What needs doing?',
  charsRemaining: '{n} characters remaining',
  titleRequired: 'Title is required.',
  titleMax: 'Title must be at most 120 characters.',
  description: 'Description',
  optional: 'optional',
  descriptionPlaceholder: 'Add a bit of context…',
  create: 'Create',
  creating: 'Creating…',
  itemsHeading: 'Items',
  search: 'Search',
  searchPlaceholder: 'Filter by title',
  clearSearch: 'Clear search',
  statusFilter: 'Status',
  statusAll: 'All',
  statusTodo: 'Todo',
  statusInProgress: 'In Progress',
  statusDone: 'Done',
  loading: 'Loading work items…',
  retry: 'Retry',
  emptyTitle: 'No items yet.',
  emptyCopy: 'Create your first work item above.',
  emptyCta: 'Add an item',
  closeCreate: 'Close create form',
  openCreate: 'New item',
  noResultsTitle: 'No results for your filters.',
  noResultsCopy: 'Try a different search or status.',
  clearFilters: 'Clear filters',
  start: 'Start',
  complete: 'Complete',
  done: 'Done',
  updating: 'Updating…',
  previous: 'Previous',
  next: 'Next',
  pageOf: 'Page {page} of {totalPages}',
  total: '{n} total',
  justNow: 'Just now',
  minutesAgo: '{n}m ago',
  hoursAgo: '{n}h ago',
  daysAgo: '{n}d ago',
  dismiss: 'Dismiss',
  notifyCreated: 'Work item created.',
  notifyStatusUpdated: 'Status updated.',
  notifyError: 'Something went wrong.',
};

const AR: Record<TranslationKey, string> = {
  appTitle: 'عناصر العمل',
  appTagline: 'تتبّع المهام من «للتنفيذ» إلى «مكتمل».',
  themeToLight: 'التبديل إلى الوضع الفاتح',
  themeToDark: 'التبديل إلى الوضع الداكن',
  langToArabic: 'العربية',
  langToEnglish: 'English',
  createHeading: 'إنشاء عنصر عمل',
  title: 'العنوان',
  titlePlaceholder: 'ماذا يجب إنجازه؟',
  charsRemaining: 'متبقي {n} حرفًا',
  titleRequired: 'العنوان مطلوب.',
  titleMax: 'العنوان بحد أقصى 120 حرفًا.',
  description: 'الوصف',
  optional: 'اختياري',
  descriptionPlaceholder: 'أضف بعض التفاصيل…',
  create: 'إنشاء',
  creating: 'جاري الإنشاء…',
  itemsHeading: 'العناصر',
  search: 'بحث',
  searchPlaceholder: 'تصفية حسب العنوان',
  clearSearch: 'مسح البحث',
  statusFilter: 'الحالة',
  statusAll: 'الكل',
  statusTodo: 'للتنفيذ',
  statusInProgress: 'قيد التنفيذ',
  statusDone: 'مكتمل',
  loading: 'جاري تحميل عناصر العمل…',
  retry: 'إعادة المحاولة',
  emptyTitle: 'لا توجد عناصر بعد.',
  emptyCopy: 'أنشئ أول عنصر من النموذج أعلاه.',
  emptyCta: 'أضف عنصرًا',
  closeCreate: 'إغلاق نموذج الإنشاء',
  openCreate: 'عنصر جديد',
  noResultsTitle: 'لا نتائج لفلاترك.',
  noResultsCopy: 'جرّب بحثًا أو حالة مختلفة.',
  clearFilters: 'مسح الفلاتر',
  start: 'بدء',
  complete: 'إكمال',
  done: 'مكتمل',
  updating: 'جاري التحديث…',
  previous: 'السابق',
  next: 'التالي',
  pageOf: 'صفحة {page} من {totalPages}',
  total: '{n} إجمالي',
  justNow: 'الآن',
  minutesAgo: 'منذ {n} د',
  hoursAgo: 'منذ {n} س',
  daysAgo: 'منذ {n} ي',
  dismiss: 'إغلاق',
  notifyCreated: 'تم إنشاء عنصر العمل.',
  notifyStatusUpdated: 'تم تحديث الحالة.',
  notifyError: 'حدث خطأ ما.',
};

const STORAGE_KEY = 'work-item-tracker-locale';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<AppLocale>(this.resolveInitial());
  readonly dir = computed(() => (this.locale() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    this.apply(this.locale());
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const table = this.locale() === 'ar' ? AR : EN;
    let text = table[key] ?? EN[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  }

  toggle(): void {
    this.setLocale(this.locale() === 'en' ? 'ar' : 'en');
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
    this.apply(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore storage failures
    }
  }

  private resolveInitial(): AppLocale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'ar') {
        return stored;
      }
    } catch {
      // fall through
    }
    return 'en';
  }

  private apply(locale: AppLocale): void {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.dataset['locale'] = locale;
  }
}
