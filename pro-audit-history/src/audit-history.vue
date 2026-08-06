<template>
  <section class="audit-showcase" aria-label="Invoice audit history workspace">
    <header class="audit-hero">
      <div>
        <span class="audit-eyebrow"><i></i> Live control log</span>
        <h1>Invoice review ledger</h1>
        <p>Edit any business field. Every change is attributed, reviewable, exportable, and reversible.</p>
      </div>
      <div class="audit-metrics" aria-label="Workspace metrics">
        <span><strong>8</strong> open invoices</span>
        <span><strong>4</strong> recorded actions</span>
        <span><strong>100%</strong> attributable</span>
      </div>
    </header>
    <div class="audit-hint"><span>Try it</span> Double-click a Customer, Status, Owner, Date, Amount, or Risk cell, then inspect the new record.</div>
    <div class="audit-workspace">
      <RevoGrid
        ref="gridRef"
        class="audit-grid"
        :theme="darkTheme ? 'darkMaterial' : 'material'"
        :source="rows"
        :columns="columns"
        :plugins="plugins"
        :audit-history.prop="auditHistory"
        :cell-flash.prop="cellFlash"
        :range="true"
        stretch="last"
        hide-attribution
      />
      <aside ref="panelRef" class="audit-panel-host"></aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  AuditHistoryPlugin,
  CellFlashPlugin,
  EventManagerPlugin,
  defineAuditHistoryPanel,
} from '@revolist/revogrid-pro';
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  prefersDarkTheme,
  type InvoiceRow,
} from './audit-history.shared';
import './audit-history.scss';

const props = defineProps<{ rows?: InvoiceRow[] }>();
const rows = ref(props.rows?.length ? props.rows : createInvoiceRows());
const columns = createAuditColumns();
const plugins = [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin];
const auditHistory = createAuditHistoryConfig();
const cellFlash = createCellFlashConfig();
const darkTheme = ref(prefersDarkTheme());
const gridRef = ref<{ $el?: HTMLRevoGridElement } | null>(null);
const panelRef = ref<HTMLElement | null>(null);
let panelHandle: ReturnType<typeof defineAuditHistoryPanel> | undefined;

onMounted(async () => {
  await nextTick();
  const grid = gridRef.value?.$el;
  if (grid && panelRef.value) panelHandle = defineAuditHistoryPanel(panelRef.value, grid, createPanelOptions());
});

onUnmounted(() => panelHandle?.destroy());
</script>
