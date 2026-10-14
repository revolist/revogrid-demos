<template>
  <section class="audit-showcase" aria-label="Invoice audit history workspace">
    <div class="audit-workspace">
      <RevoGrid
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
        @aftergridinit="mountAuditPanel"
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
const panelRef = ref<HTMLElement | null>(null);
let panelHandle: ReturnType<typeof defineAuditHistoryPanel> | undefined;
let disconnectTheme: (() => void) | undefined;
let disposed = false;

async function mountAuditPanel(event: Event) {
  // The functional wrapper has no component ref; use the native readiness event.
  await nextTick();
  if (disposed || panelHandle || !panelRef.value) return;
  panelHandle = defineAuditHistoryPanel(panelRef.value, event.target as HTMLRevoGridElement, createPanelOptions());
}

onMounted(() => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
});

onUnmounted(() => {
  disposed = true;
  disconnectTheme?.();
  panelHandle?.destroy();
});
</script>
