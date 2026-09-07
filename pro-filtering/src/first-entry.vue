<template>
  <section class="order-explorer order-first-entry" aria-label="Order Explorer: review orders">
    <div class="order-first-entry__brief">
      <p class="order-first-entry__eyebrow">Order review workflow</p>
      <h2>Find Northstar orders that need review and total at least $1,000.</h2>
    </div>
    <div class="order-first-entry__steps">
      <div class="order-first-entry__step" :class="stepClass(0)" :aria-current="state.progress === 0 ? 'step' : undefined">
        <div class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true"><i v-if="state.progress > 0" class="fa-solid fa-check"></i><template v-else>1</template></span><strong>Choose Review queue</strong></div>
        <p>Orders waiting for a review or payment check.</p>
        <button class="rv-btn" type="button" :aria-pressed="state.queue" @click="controller?.queue(!state.queue)">Review queue</button>
      </div>
      <div class="order-first-entry__step" :class="stepClass(1)" :aria-current="state.progress === 1 ? 'step' : undefined">
        <label><span class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true"><i v-if="state.progress > 1" class="fa-solid fa-check"></i><template v-else>2</template></span><strong>Search “Northstar”</strong></span>
          <input class="order-explorer__search-input" type="search" :value="state.query" placeholder="Customer or order number" aria-label="Search orders" @input="controller?.search(($event.target as HTMLInputElement).value)" />
        </label>
        <p>Try Northstar to find this customer’s orders.</p>
      </div>
      <div class="order-first-entry__step" :class="stepClass(2)" :aria-current="state.progress === 2 ? 'step' : undefined">
        <div class="order-first-entry__step-heading"><span class="order-first-entry__step-number" aria-hidden="true"><i v-if="state.progress > 2" class="fa-solid fa-check"></i><template v-else>3</template></span><strong>Filter Total ≥ $1,000</strong></div>
        <div class="order-first-entry__refine">
          <button class="rv-btn" type="button" :aria-pressed="state.highValue" @click="controller?.amount(!state.highValue)">Total ≥ $1,000</button>
          <label>Status
            <select :value="state.status" @change="controller?.status(($event.target as HTMLSelectElement).value)">
              <option value="">All statuses</option>
              <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </label>
        </div>
      </div>
    </div>
    <div class="order-explorer__summary">
      <div class="order-first-entry__result" :aria-busy="state.busy"><span class="order-explorer__count" aria-live="polite">{{ state.visibleCount }} of 120 orders</span><span v-if="state.busy" class="order-first-entry__updating">Updating…</span></div>
      <div class="order-first-entry__summary-actions">
        <span class="order-first-entry__progress" aria-label="Scenario progress">{{ state.progress }} of 3 complete</span>
        <button v-if="state.compact" class="rv-btn-secondary" type="button" :aria-pressed="state.showAllColumns" @click="controller?.showAllColumns(!state.showAllColumns)">{{ state.showAllColumns ? 'Show key columns' : 'Show all columns' }}</button>
        <button class="rv-btn-secondary" type="button" @click="controller?.reset()">Reset demo</button>
        <a href="/demo/filtering">Explore all advanced filters</a>
      </div>
    </div>
    <div v-if="!state.busy && state.progress === 3 && state.visibleCount > 0" class="order-first-entry__success" role="status">
      <p><strong>You found {{ state.visibleCount }} matching orders.</strong> Try this workflow with your own data.</p>
      <a class="order-first-entry__trial" :href="trialHref">Try free for 30 days</a>
    </div>
    <div v-if="!state.busy && state.visibleCount === 0" class="order-first-entry__empty" role="status"><span>No orders match. Change your search or filters, or reset the demo.</span><button class="rv-btn-secondary" type="button" @click="controller?.reset()">Reset demo</button></div>
    <div class="order-first-entry__grid-shell"><div ref="host" class="order-explorer__grid"></div></div>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { ORDER_STATUSES } from './filtering.data';
import { FIRST_ENTRY_TRIAL_HREF, firstEntryStepState, initialFirstEntryState, REVIEW_STATUSES } from './first-entry.data';
import { createFirstEntryController, type FirstEntryController } from './first-entry.controller';
import './filtering.scss';
import './first-entry.scss';
const state = ref(initialFirstEntryState());
const statuses = computed(() => state.value.queue ? REVIEW_STATUSES : ORDER_STATUSES);
const trialHref = FIRST_ENTRY_TRIAL_HREF;
const stepClass = (index: number) => {
  const step = firstEntryStepState(state.value, index);
  return { 'is-current': step.current, 'is-complete': step.complete };
};
const host = ref<HTMLElement>();
let controller: FirstEntryController | undefined;
onMounted(() => { controller = createFirstEntryController(host.value!, value => { state.value = value; }); });
onBeforeUnmount(() => controller?.dispose());
</script>
