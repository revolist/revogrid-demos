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
  type AuditHistoryPanelOptions,
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

const props = defineProps<{ rows?: InvoiceRow[]; example?: 'records' | 'panel' | 'restore' | 'storage' | 'policies' | 'localization' | 'export' }>();
const rows = ref(props.rows?.length ? props.rows : createInvoiceRows());
const columns = createAuditColumns();
const plugins = [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin];
const auditHistory = createAuditHistoryConfig();
const panelOptions: AuditHistoryPanelOptions = createPanelOptions();
if (props.example) panelOptions.allowClose = false;
if (props.example === 'storage') {
  const seededRecords = auditHistory.records;
  auditHistory.records = undefined;
  auditHistory.storage = 'custom';
  auditHistory.storageAdapter = { load: async () => seededRecords ?? [] };
}
if (props.example === 'policies') {
  auditHistory.immutable = true;
  panelOptions.restoreActions = false;
}
if (props.example === 'localization') {
  panelOptions.locale = 'es-ES';
  panelOptions.dateFormat = 'eu';
  panelOptions.timeFormat = '24h';
  panelOptions.labels = {
    title: 'Registro de cambios', allTab: 'Toda actividad', rowTab: 'Esta fila', cellTab: 'Esta celda',
    addFilter: 'Filtros', closeFilters: 'Listo', searchPlaceholder: 'Buscar…', searchAriaLabel: 'Buscar actividad',
    userPlaceholder: 'Persona', allColumns: 'Todos los campos', allActions: 'Todos los eventos',
    clearFilters: 'Quitar filtros', export: 'Exportar', dayToday: 'Hoy', dayYesterday: 'Ayer',
  };
}
if (props.example === 'records' || props.example === 'storage' || props.example === 'localization' || props.example === 'export') {
  panelOptions.restoreActions = false;
}
const cellFlash = createCellFlashConfig();
const darkTheme = ref(currentTheme().isDark());
const panelRef = ref<HTMLElement | null>(null);
let panelHandle: ReturnType<typeof defineAuditHistoryPanel> | undefined;
let disposed = false;
let disconnectTheme: (() => void) | undefined;

async function mountAuditPanel(event: Event) {
  // The functional wrapper has no component ref; use the native readiness event.
  await nextTick();
  if (disposed || panelHandle || !panelRef.value) return;
  panelHandle = defineAuditHistoryPanel(panelRef.value, event.target as HTMLRevoGridElement, panelOptions);
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
