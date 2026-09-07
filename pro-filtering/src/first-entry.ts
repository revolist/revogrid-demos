import { ORDER_STATUSES } from './filtering.data';
import { FIRST_ENTRY_TRIAL_HREF, firstEntryStepState, REVIEW_STATUSES } from './first-entry.data';
import { createFirstEntryController } from './first-entry.controller';
import './filtering.scss';
import './first-entry.scss';

export function loadFirstEntry(parent: Element) {
  const section = document.createElement('section');
  section.className = 'order-explorer order-first-entry';
  section.setAttribute('aria-label', 'Order Explorer: review orders');
  // Static demo markup only. Search text and data never enter HTML.
  section.innerHTML = `
    <div class="order-first-entry__brief">
      <p class="order-first-entry__eyebrow">Order review workflow</p>
      <h2>Find Northstar orders that need review and total at least $1,000.</h2>
    </div>
    <div class="order-first-entry__steps">
      <div class="order-first-entry__step" data-step="0">
        <div class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true">1</span><strong>Choose Review queue</strong></div>
        <p>Orders waiting for a review or payment check.</p>
        <button class="rv-btn" type="button" data-action="queue" aria-pressed="false">Review queue</button>
      </div>
      <div class="order-first-entry__step" data-step="1">
        <label><span class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true">2</span><strong>Search “Northstar”</strong></span>
          <input class="order-explorer__search-input" type="search" placeholder="Customer or order number" aria-label="Search orders" />
        </label>
        <p>Try Northstar to find this customer’s orders.</p>
      </div>
      <div class="order-first-entry__step" data-step="2">
        <div class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true">3</span><strong>Filter Total ≥ $1,000</strong></div>
        <div class="order-first-entry__refine">
          <button class="rv-btn" type="button" data-action="amount" aria-pressed="false">Total ≥ $1,000</button>
          <label>Status<select><option value="">All statuses</option></select></label>
        </div>
      </div>
    </div>
    <div class="order-explorer__summary">
      <div class="order-first-entry__result" aria-busy="false"><span class="order-explorer__count" aria-live="polite">120 of 120 orders</span><span class="order-first-entry__updating" hidden>Updating…</span></div>
      <div class="order-first-entry__summary-actions"><span class="order-first-entry__progress" aria-label="Scenario progress">0 of 3 complete</span><button class="rv-btn-secondary" type="button" data-action="columns" aria-pressed="false" hidden>Show all columns</button><button class="rv-btn-secondary" type="button" data-action="reset">Reset demo</button><a href="/demo/filtering">Explore all advanced filters</a></div>
    </div>
    <div class="order-first-entry__success" role="status" hidden><p><strong></strong> Try this workflow with your own data.</p><a class="order-first-entry__trial" href="${FIRST_ENTRY_TRIAL_HREF}">Try free for 30 days</a></div>
    <div class="order-first-entry__empty" role="status" hidden><span>No orders match. Change your search or filters, or reset the demo.</span><button class="rv-btn-secondary" type="button" data-action="empty-reset">Reset demo</button></div>
    <div class="order-first-entry__grid-shell"><div class="order-explorer__grid"></div></div>`;
  parent.append(section);
  const queue = section.querySelector<HTMLButtonElement>('[data-action="queue"]')!;
  const amount = section.querySelector<HTMLButtonElement>('[data-action="amount"]')!;
  const input = section.querySelector('input')!;
  const status = section.querySelector('select')!;
  const columnsButton = section.querySelector<HTMLButtonElement>('[data-action="columns"]')!;
  const result = section.querySelector<HTMLElement>('.order-first-entry__result')!;
  const updating = section.querySelector<HTMLElement>('.order-first-entry__updating')!;
  const success = section.querySelector<HTMLElement>('.order-first-entry__success')!;
  let queueActive = false;
  let amountActive = false;
  let previousOptions = '';
  const controller = createFirstEntryController(section.querySelector('.order-explorer__grid')!, state => {
    queueActive = state.queue;
    amountActive = state.highValue;
    queue.setAttribute('aria-pressed', String(state.queue));
    amount.setAttribute('aria-pressed', String(state.highValue));
    input.value = state.query;
    const statuses = state.queue ? REVIEW_STATUSES : ORDER_STATUSES;
    if (previousOptions !== statuses.join()) {
      status.replaceChildren(new Option('All statuses', ''), ...statuses.map(value => new Option(value, value)));
      previousOptions = statuses.join();
    }
    status.value = state.status;
    section.querySelector('.order-explorer__count')!.textContent = `${state.visibleCount} of 120 orders`;
    result.setAttribute('aria-busy', String(state.busy));
    updating.hidden = !state.busy;
    section.querySelector('[aria-label="Scenario progress"]')!.textContent = `${state.progress} of 3 complete`;
    section.querySelector<HTMLElement>('.order-first-entry__empty')!.hidden = state.busy || state.visibleCount !== 0;
    columnsButton.hidden = !state.compact;
    columnsButton.setAttribute('aria-pressed', String(state.showAllColumns));
    columnsButton.textContent = state.showAllColumns ? 'Show key columns' : 'Show all columns';
    success.hidden = state.busy || state.progress !== 3 || state.visibleCount === 0;
    success.querySelector('strong')!.textContent = `You found ${state.visibleCount} matching orders.`;
    section.querySelectorAll<HTMLElement>('[data-step]').forEach((step, index) => {
      const visual = firstEntryStepState(state, index);
      step.classList.toggle('is-current', visual.current);
      step.classList.toggle('is-complete', visual.complete);
      visual.current ? step.setAttribute('aria-current', 'step') : step.removeAttribute('aria-current');
      step.querySelector<HTMLElement>('.order-first-entry__step-number')!.innerHTML = visual.complete
        ? '<i class="fa-solid fa-check"></i>'
        : String(index + 1);
    });
  });
  queue.onclick = () => controller.queue(!queueActive);
  amount.onclick = () => controller.amount(!amountActive);
  input.oninput = () => controller.search(input.value);
  status.onchange = () => controller.status(status.value);
  columnsButton.onclick = () => controller.showAllColumns(columnsButton.getAttribute('aria-pressed') !== 'true');
  section.querySelector<HTMLButtonElement>('[data-action="reset"]')!.onclick = () => controller.reset();
  section.querySelector<HTMLButtonElement>('[data-action="empty-reset"]')!.onclick = () => controller.reset();
  return () => { controller.dispose(); section.remove(); };
}
