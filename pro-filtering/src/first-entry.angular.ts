import { Component, ChangeDetectorRef, inject, ElementRef, ViewChild, ViewEncapsulation, type AfterViewInit, type OnDestroy } from '@angular/core';
import { ORDER_STATUSES } from './filtering.data';
import { FIRST_ENTRY_TRIAL_HREF, firstEntryStepState, initialFirstEntryState, REVIEW_STATUSES } from './first-entry.data';
import { createFirstEntryController, type FirstEntryController } from './first-entry.controller';

@Component({
  selector: 'order-first-entry',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./filtering.scss', './first-entry.scss'],
  template: `
    <section class="order-explorer order-first-entry" aria-label="Order Explorer: review orders">
      <div class="order-first-entry__brief"><p class="order-first-entry__eyebrow">Order review workflow</p><h2>Find Northstar orders that need review and total at least $1,000.</h2></div>
      <div class="order-first-entry__steps">
        <div class="order-first-entry__step" [class.is-current]="step(0).current" [class.is-complete]="step(0).complete" [attr.aria-current]="state.progress === 0 ? 'step' : null">
          <div class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true">@if (state.progress > 0) { <i class="fa-solid fa-check"></i> } @else { 1 }</span><strong>Choose Review queue</strong></div>
          <p>Orders waiting for a review or payment check.</p>
          <button class="rv-btn" type="button" [attr.aria-pressed]="state.queue" (click)="controller?.queue(!state.queue)">Review queue</button>
        </div>
        <div class="order-first-entry__step" [class.is-current]="step(1).current" [class.is-complete]="step(1).complete" [attr.aria-current]="state.progress === 1 ? 'step' : null">
          <label><span class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true">@if (state.progress > 1) { <i class="fa-solid fa-check"></i> } @else { 2 }</span><strong>Search “Northstar”</strong></span>
            <input class="order-explorer__search-input" type="search" [value]="state.query" placeholder="Customer or order number" aria-label="Search orders" (input)="search($event)" />
          </label>
          <p>Try Northstar to find this customer’s orders.</p>
        </div>
        <div class="order-first-entry__step" [class.is-current]="step(2).current" [class.is-complete]="step(2).complete" [attr.aria-current]="state.progress === 2 ? 'step' : null">
          <div class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true">@if (state.progress > 2) { <i class="fa-solid fa-check"></i> } @else { 3 }</span><strong>Filter Total ≥ $1,000</strong></div>
          <div class="order-first-entry__refine">
            <button class="rv-btn" type="button" [attr.aria-pressed]="state.highValue" (click)="controller?.amount(!state.highValue)">Total ≥ $1,000</button>
            <label>Status
              <select [value]="state.status" (change)="status($event)">
                <option value="">All statuses</option>
                @for (status of statuses; track status) { <option [value]="status">{{ status }}</option> }
              </select>
            </label>
          </div>
        </div>
      </div>
      <div class="order-explorer__summary">
        <div class="order-first-entry__result" [attr.aria-busy]="state.busy"><span class="order-explorer__count" aria-live="polite">{{ state.visibleCount }} of 120 orders</span>@if (state.busy) { <span class="order-first-entry__updating">Updating…</span> }</div>
        <div class="order-first-entry__summary-actions"><span class="order-first-entry__progress" aria-label="Scenario progress">{{ state.progress }} of 3 complete</span>@if (state.compact) { <button class="rv-btn-secondary" type="button" [attr.aria-pressed]="state.showAllColumns" (click)="controller?.showAllColumns(!state.showAllColumns)">{{ state.showAllColumns ? 'Show key columns' : 'Show all columns' }}</button> }<button class="rv-btn-secondary" type="button" (click)="controller?.reset()">Reset demo</button><a href="/demo/filtering">Explore all advanced filters</a></div>
      </div>
      @if (!state.busy && state.progress === 3 && state.visibleCount > 0) {
        <div class="order-first-entry__success" role="status"><p><strong>You found {{ state.visibleCount }} matching orders.</strong> Try this workflow with your own data.</p><a class="order-first-entry__trial" [href]="trialHref">Try free for 30 days</a></div>
      }
      @if (!state.busy && state.visibleCount === 0) {
        <div class="order-first-entry__empty" role="status"><span>No orders match. Change your search or filters, or reset the demo.</span><button class="rv-btn-secondary" type="button" (click)="controller?.reset()">Reset demo</button></div>
      }
      <div class="order-first-entry__grid-shell"><div #host class="order-explorer__grid"></div></div>
    </section>
  `,
})
export class FirstEntryComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host') host!: ElementRef<HTMLElement>;
  private readonly changes = inject(ChangeDetectorRef);
  state = initialFirstEntryState();
  readonly trialHref = FIRST_ENTRY_TRIAL_HREF;
  controller?: FirstEntryController;
  get statuses() { return this.state.queue ? REVIEW_STATUSES : ORDER_STATUSES; }
  step(index: number) { return firstEntryStepState(this.state, index); }
  ngAfterViewInit() {
    this.controller = createFirstEntryController(this.host.nativeElement, state => { this.state = state; this.changes.markForCheck(); });
  }
  search(event: Event) { this.controller?.search((event.target as HTMLInputElement).value); }
  status(event: Event) { this.controller?.status((event.target as HTMLSelectElement).value); }
  ngOnDestroy() { this.controller?.dispose(); }
}
