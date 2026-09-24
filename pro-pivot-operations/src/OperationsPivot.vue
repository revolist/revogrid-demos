<template>
  <main class="operations-demo">
    <header class="page-header">
      <div>
        <p class="eyebrow">RevoGrid Pivot · support operations</p>
        <h1>Where are tickets breaching SLA?</h1>
        <p>Compare volume, average resolution time, and breaches by team and priority. Select a scope to inspect its source tickets.</p>
      </div>
      <a href="https://pro.rv-grid.com/guides/pivot/" target="_blank" rel="noreferrer">Pivot guide ↗</a>
    </header>

    <section class="controls" aria-label="Ticket scope">
      <label>Team
        <select v-model="team">
          <option value="All">All teams</option>
          <option v-for="item in TEAMS" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>Priority
        <select v-model="priority">
          <option value="All">All priorities</option>
          <option v-for="item in PRIORITIES" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <button type="button" @click="reset">Reset scope</button>
      <span class="scope-count" aria-live="polite">{{ summary.count }} source tickets</span>
    </section>

    <section class="metrics" aria-label="Summary of selected tickets">
      <article><strong>{{ summary.count }}</strong><span>Tickets</span></article>
      <article><strong>{{ summary.averageResolutionHours === null ? '—' : summary.averageResolutionHours.toFixed(1) + ' h' }}</strong><span>Average resolution · resolved only</span></article>
      <article><strong>{{ summary.breached }}</strong><span>SLA breaches</span></article>
      <article><strong>{{ summary.open }}</strong><span>Still open</span></article>
    </section>

    <div class="workspace">
      <section class="pivot-panel" aria-labelledby="pivot-heading">
        <div class="panel-heading"><h2 id="pivot-heading">Pivot summary</h2><span>Rows: team · Columns: priority</span></div>
        <div class="pivot-grid">
          <RevoGrid
            class="cell-border"
            hide-attribution
            readonly
            resize
            :source="scopedTickets"
            :columns="columns"
            :plugins="plugins"
            :pivot.prop="pivotConfig"
            theme="compact"
            @afterfocus="onPivotFocus"
          />
        </div>
      </section>

      <section class="detail-panel" aria-labelledby="detail-heading">
        <div class="panel-heading"><h2 id="detail-heading">Source tickets</h2><span>{{ cellMode ? focusedLabel : scopeLabel }}</span></div>
        <p class="detail-description">{{ cellMode ? 'Showing the source records for the focused pivot value cell.' : 'These records are the exact input to the pivot above for the selected scope.' }} Open tickets do not contribute to average resolution time.</p>
        <div class="detail-actions">
          <button type="button" :disabled="!focusedCell" @click="inspectFocusedCell">Inspect focused value cell</button>
          <button v-if="cellMode" type="button" @click="showScope">Show selected scope</button>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>ID</th><th>Team</th><th>Priority</th><th>Category</th><th>Opened</th><th>Resolution</th><th>SLA</th></tr></thead>
            <tbody>
              <tr v-for="ticket in visibleTickets" :key="ticket['Ticket ID']">
                <td>{{ ticket['Ticket ID'] }}</td><td>{{ ticket.Team }}</td><td>{{ ticket.Priority }}</td><td>{{ ticket.Category }}</td>
                <td>{{ ticket['Opened At'].slice(0, 10) }}</td>
                <td>{{ ticket['Resolution Hours'] === null ? 'Open' : ticket['Resolution Hours'] + ' h' }}</td>
                <td><span :class="['status', ticket['SLA Status'].toLowerCase()]">{{ ticket['SLA Status'] }}</span></td>
              </tr>
              <tr v-if="!visibleTickets.length"><td colspan="7">No tickets in this view.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span>Showing {{ visibleTickets.length ? page * pageSize + 1 : 0 }}–{{ Math.min((page + 1) * pageSize, detailCount) }} of {{ detailCount }}</span>
          <div><button type="button" :disabled="page === 0" @click="changePage(page - 1)">Previous</button><button type="button" :disabled="(page + 1) * pageSize >= detailCount" @click="changePage(page + 1)">Next</button></div>
        </div>
      </section>
    </div>
    <p class="provenance">Synthetic, deterministic sample · 480 tickets opened in 2025 · dates shown in UTC · no customer data.</p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import type { FocusAfterRenderEvent } from '@revolist/revogrid';
import { getPivotColumnMeta, getPivotRowMeta, type PivotDrilldownCellRef } from '@revolist/pivot';
import { columns, pivotConfig, plugins } from './pivot';
import { PRIORITIES, TEAMS, TICKETS, pageTickets, summarizeTickets, ticketsForPivotCell, ticketsInScope, type TicketPriority, type TicketTeam } from './tickets';

const team = ref<TicketTeam | 'All'>('All');
const priority = ref<TicketPriority | 'All'>('All');
const page = ref(0);
const pageSize = 15;
const focusedCell = ref<PivotDrilldownCellRef | null>(null);
const activeCell = ref<PivotDrilldownCellRef | null>(null);
const focusedLabel = ref('');
const cellMode = ref(false);
const drillTickets = ref<typeof TICKETS>([]);
const drillTotal = ref(0);
const scopedTickets = computed(() => ticketsInScope(TICKETS, { team: team.value, priority: priority.value }));
const summary = computed(() => summarizeTickets(scopedTickets.value));
const detailCount = computed(() => cellMode.value ? drillTotal.value : summary.value.count);
const visibleTickets = computed(() => cellMode.value ? drillTickets.value : pageTickets(scopedTickets.value, page.value, pageSize));
const scopeLabel = computed(() => `${team.value === 'All' ? 'All teams' : team.value} · ${priority.value === 'All' ? 'All priorities' : priority.value}`);
watch([team, priority], () => { showScope(); focusedCell.value = null; });
function reset() { team.value = 'All'; priority.value = 'All'; showScope(); focusedCell.value = null; }
function showScope() { activeCell.value = null; cellMode.value = false; page.value = 0; }

function onPivotFocus(event: CustomEvent<FocusAfterRenderEvent>) {
  const row = getPivotRowMeta(event.detail.model);
  const column = getPivotColumnMeta(event.detail.column);
  if (!row || !column?.measure || !column.prop) {
    focusedCell.value = null;
    return;
  }
  focusedCell.value = { rowPath: [...row.path], columnPath: [...column.path], dataIndex: column.measure.valueIndex };
  focusedLabel.value = `${row.labels.join(' / ') || 'All teams'} · ${column.labels.join(' / ') || 'All priorities'} · ${column.measure.label}`;
}

function loadDrillPage(nextPage: number) {
  if (!activeCell.value) return;
  const records = ticketsForPivotCell(scopedTickets.value, activeCell.value);
  drillTickets.value = pageTickets(records, nextPage, pageSize);
  drillTotal.value = records.length;
  page.value = nextPage;
  cellMode.value = true;
}
function inspectFocusedCell() { activeCell.value = focusedCell.value; loadDrillPage(0); }
function changePage(nextPage: number) {
  if (cellMode.value) loadDrillPage(nextPage);
  else page.value = nextPage;
}
</script>

<style scoped>
.operations-demo{font:14px/1.5 system-ui,sans-serif;color:#253040;background:#f6f8fb;min-height:100vh;padding:24px;box-sizing:border-box}
.page-header,.controls,.panel-heading,.pagination{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-header{align-items:start;max-width:1500px;margin:auto auto 20px}.page-header h1{font-size:clamp(26px,3vw,38px);line-height:1.15;margin:4px 0 8px}.page-header p{margin:0;color:#596779}.page-header a{white-space:nowrap;color:#087e66;font-weight:600}.eyebrow{color:#087e66!important;text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:700}
.controls,.metrics,.workspace,.provenance{max-width:1500px;margin-left:auto;margin-right:auto}.controls{justify-content:flex-start;background:#fff;border:1px solid #dce4ed;border-radius:10px;padding:12px 16px;flex-wrap:wrap}.controls label{display:flex;align-items:center;gap:8px;font-weight:600}.controls select,.controls button,.pagination button{font:inherit;background:#fff;border:1px solid #bdc9d6;border-radius:7px;padding:7px 10px;color:inherit}.controls button,.pagination button{cursor:pointer}.pagination button:disabled{opacity:.45;cursor:not-allowed}.scope-count{margin-left:auto;color:#596779}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px;margin-bottom:12px}.metrics article,.pivot-panel,.detail-panel{background:#fff;border:1px solid #dce4ed;border-radius:10px}.metrics article{padding:14px 16px;display:flex;flex-direction:column}.metrics strong{font-size:24px;line-height:1.2}.metrics span,.panel-heading span,.detail-description,.pagination,.provenance{color:#617084;font-size:12px}.workspace{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:12px}.pivot-panel,.detail-panel{min-width:0;overflow:hidden}.panel-heading{padding:12px 16px;border-bottom:1px solid #e5ebf1}.panel-heading h2{font-size:16px;margin:0}.pivot-grid{height:530px;overflow:auto}.pivot-grid revo-grid{height:100%;min-width:620px}.detail-description{margin:12px 16px}.table-scroll{overflow:auto;max-height:430px}table{border-collapse:collapse;width:100%;white-space:nowrap;font-size:12px}th,td{padding:9px 10px;border-bottom:1px solid #edf0f4;text-align:left}th{position:sticky;top:0;background:#f5f8fb;z-index:1}.status{border-radius:99px;padding:2px 7px;background:#e7f6ee;color:#187245}.status.breached{background:#ffebe8;color:#a22b24}.status.open{background:#e9efff;color:#365bb2}.pagination{padding:12px 16px}.pagination div{display:flex;gap:6px}.provenance{padding:8px 2px}
@media(max-width:1050px){.workspace{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.operations-demo{padding:12px}.page-header{display:block}.page-header a{display:inline-block;margin-top:12px}.metrics{gap:6px}.controls label{width:100%;justify-content:space-between}.scope-count{margin-left:0}}
.detail-actions{display:flex;align-items:center;gap:8px;padding:0 16px 12px}.detail-actions button{font:inherit;background:#fff;border:1px solid #bdc9d6;border-radius:7px;padding:7px 10px;cursor:pointer}.detail-actions button:disabled{opacity:.45;cursor:not-allowed}
</style>
