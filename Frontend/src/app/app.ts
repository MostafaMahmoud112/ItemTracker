import { Component, inject } from '@angular/core';
import { I18nService } from './i18n/i18n.service';
import { ThemeService } from './theme/theme.service';
import { WorkItemsComponent } from './work-items/work-items';

@Component({
  selector: 'app-root',
  imports: [WorkItemsComponent],
  template: '<app-work-items />',
  styles: ':host { display: block; min-height: 100vh; width: 100%; }',
})
export class App {
  private readonly _theme = inject(ThemeService);
  private readonly _i18n = inject(I18nService);
}
