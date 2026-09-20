import { Component } from '@angular/core';
import { WorkItemsComponent } from './work-items/work-items';

@Component({
  selector: 'app-root',
  imports: [WorkItemsComponent],
  template: '<app-work-items />',
  styles: ':host { display: block; }',
})
export class App {}
