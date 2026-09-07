import { useEffect, useRef, useState } from 'react';
import { ORDER_STATUSES } from './filtering.data';
import { FIRST_ENTRY_TRIAL_HREF, firstEntryStepState, initialFirstEntryState, REVIEW_STATUSES } from './first-entry.data';
import { createFirstEntryController, type FirstEntryController } from './first-entry.controller';
import './filtering.scss';
import './first-entry.scss';

export default function FirstEntry() {
  const [state, setState] = useState(initialFirstEntryState);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<FirstEntryController>();
  useEffect(() => {
    const instance = createFirstEntryController(host.current!, setState);
    controller.current = instance;
    return () => instance.dispose();
  }, []);
  const statuses = state.queue ? REVIEW_STATUSES : ORDER_STATUSES;
  const stepClass = (index: number) => {
    const step = firstEntryStepState(state, index);
    return `order-first-entry__step${step.current ? ' is-current' : ''}${step.complete ? ' is-complete' : ''}`;
  };
  return <section className="order-explorer order-first-entry" aria-label="Order Explorer: review orders">
    <div className="order-first-entry__brief"><p className="order-first-entry__eyebrow">Order review workflow</p><h2>Find Northstar orders that need review and total at least $1,000.</h2></div>
    <div className="order-first-entry__steps">
      <div className={stepClass(0)} aria-current={state.progress === 0 ? 'step' : undefined}>
        <div className="order-first-entry__step-heading"><span className="order-first-entry__step-number" aria-hidden="true">{state.progress > 0 ? <i className="fa-solid fa-check" /> : '1'}</span><strong>Choose Review queue</strong></div>
        <p>Orders waiting for a review or payment check.</p>
        <button className="rv-btn" type="button" aria-pressed={state.queue} onClick={() => controller.current?.queue(!state.queue)}>Review queue</button>
      </div>
      <div className={stepClass(1)} aria-current={state.progress === 1 ? 'step' : undefined}>
        <label><span className="order-first-entry__step-heading"><span className="order-first-entry__step-number" aria-hidden="true">{state.progress > 1 ? <i className="fa-solid fa-check" /> : '2'}</span><strong>Search “Northstar”</strong></span>
          <input className="order-explorer__search-input" type="search" value={state.query} placeholder="Customer or order number" aria-label="Search orders" onChange={event => controller.current?.search(event.target.value)} />
        </label>
        <p>Try Northstar to find this customer’s orders.</p>
      </div>
      <div className={stepClass(2)} aria-current={state.progress === 2 ? 'step' : undefined}>
        <div className="order-first-entry__step-heading"><span className="order-first-entry__step-number" aria-hidden="true">{state.progress > 2 ? <i className="fa-solid fa-check" /> : '3'}</span><strong>Filter Total ≥ $1,000</strong></div>
        <div className="order-first-entry__refine">
          <button className="rv-btn" type="button" aria-pressed={state.highValue} onClick={() => controller.current?.amount(!state.highValue)}>Total ≥ $1,000</button>
          <label>Status
            <select value={state.status} onChange={event => controller.current?.status(event.target.value)}>
              <option value="">All statuses</option>
              {statuses.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </div>
    </div>
    <div className="order-explorer__summary">
      <div className="order-first-entry__result" aria-busy={state.busy}><span className="order-explorer__count" aria-live="polite">{state.visibleCount} of 120 orders</span>{state.busy && <span className="order-first-entry__updating">Updating…</span>}</div>
      <div className="order-first-entry__summary-actions"><span className="order-first-entry__progress" aria-label="Scenario progress">{state.progress} of 3 complete</span>{state.compact && <button className="rv-btn-secondary" type="button" aria-pressed={state.showAllColumns} onClick={() => controller.current?.showAllColumns(!state.showAllColumns)}>{state.showAllColumns ? 'Show key columns' : 'Show all columns'}</button>}<button className="rv-btn-secondary" type="button" onClick={() => controller.current?.reset()}>Reset demo</button><a href="/demo/filtering">Explore all advanced filters</a></div>
    </div>
    {!state.busy && state.progress === 3 && state.visibleCount > 0 && <div className="order-first-entry__success" role="status"><p><strong>You found {state.visibleCount} matching orders.</strong> Try this workflow with your own data.</p><a className="order-first-entry__trial" href={FIRST_ENTRY_TRIAL_HREF}>Try free for 30 days</a></div>}
    {!state.busy && state.visibleCount === 0 && <div className="order-first-entry__empty" role="status"><span>No orders match. Change your search or filters, or reset the demo.</span><button className="rv-btn-secondary" type="button" onClick={() => controller.current?.reset()}>Reset demo</button></div>}
    <div className="order-first-entry__grid-shell"><div ref={host} className="order-explorer__grid" /></div>
  </section>;
}
