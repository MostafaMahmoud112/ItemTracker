import { Component, Input } from '@angular/core';

export type IconName =
  | 'search'
  | 'clear'
  | 'sun'
  | 'moon'
  | 'arrow-right'
  | 'check'
  | 'alert'
  | 'inbox'
  | 'filter'
  | 'chevron-left'
  | 'chevron-right'
  | 'spinner'
  | 'logo';

@Component({
  selector: 'app-icon',
  template: `
    @switch (name) {
      @case ('search') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      }
      @case ('clear') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      }
      @case ('sun') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      }
      @case ('moon') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
      }
      @case ('arrow-right') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
      @case ('check') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12l5 5L20 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
      @case ('alert') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 9v4M12 17h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M10.3 4.9L2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      }
      @case ('inbox') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 13l2.2-7.2A2 2 0 0 1 7.1 4.5h9.8a2 2 0 0 1 1.9 1.3L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M3 13h5.2a2 2 0 0 1 1.8 1.1l.4.8a2 2 0 0 0 1.8 1.1h1.6a2 2 0 0 0 1.8-1.1l.4-.8A2 2 0 0 1 15.8 13H21" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      }
      @case ('filter') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      }
      @case ('chevron-left') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
      @case ('chevron-right') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
      @case ('spinner') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="icon--spin">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      }
      @case ('logo') {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.15" />
          <path d="M8 12.5l2.5 2.5L16 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1.1em;
      height: 1.1em;
      line-height: 0;
      flex-shrink: 0;
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .icon--spin {
      animation: spin 0.7s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .icon--spin {
        animation: none;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
}
