import { Component, inject } from '@angular/core';
import { ThemeService } from './theme/theme.service';
import { WorkItemsComponent } from './work-items/work-items';

@Component({
  selector: 'app-root',
  imports: [WorkItemsComponent],
  template: '<app-work-items />',
  styles: ':host { display: block; min-height: 100vh; }',
})
export class App {
  // touch the service early so the theme attribute is applied on boot
  private readonly _theme = inject(ThemeService);
}
