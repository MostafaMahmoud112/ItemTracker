import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, TranslationKey } from './i18n.service';

@Pipe({
  name: 't',
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    // depend on locale so the view refreshes when language changes
    this.i18n.locale();
    return this.i18n.t(key, params);
  }
}
