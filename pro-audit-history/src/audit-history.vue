<template>
  <section class="audit-showcase" aria-label="Invoice audit history workspace">
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
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  type InvoiceRow,
} from './audit-history.shared';
import './audit-history.scss';

const props = defineProps<{ rows?: InvoiceRow[] }>();
const rows = ref(props.rows?.length ? props.rows : createInvoiceRows());
const columns = createAuditColumns();
const plugins = [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin];
const auditHistory = createAuditHistoryConfig();
const cellFlash = createCellFlashConfig();
const darkTheme = ref(currentTheme().isDark());
const gridRef = ref<{ $el?: HTMLRevoGridElement } | null>(null);
const panelRef = ref<HTMLElement | null>(null);
let panelHandle: ReturnType<typeof defineAuditHistoryPanel> | undefined;
let disconnectTheme: (() => void) | undefined;

onMounted(async () => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
  await nextTick();
  const grid = gridRef.value?.$el;
  if (grid && panelRef.value) panelHandle = defineAuditHistoryPanel(panelRef.value, grid, createPanelOptions());
});

onUnmounted(() => {
  disconnectTheme?.();
  panelHandle?.destroy();
});
</script>
