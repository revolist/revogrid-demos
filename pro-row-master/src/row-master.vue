<template>
  <section class="row-master-showcase" aria-label="Row Master portfolio explorer">
    <RevoGrid
      class="row-master-grid"
      :theme="darkTheme ? 'darkMaterial' : 'material'"
      :source="rows"
      :columns="columns"
      :plugins="plugins"
      :master-row.prop="masterRow"
      :tree.prop="tree"
      :readonly="true"
      stretch="last"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

const props = defineProps<{ rows?: MasterProjectRow[] }>();
const rows = ref(props.rows?.length ? props.rows : createMasterRows());
const columns = createMasterColumns(rows.value);
const plugins = [TreeDataPlugin, MasterRowPlugin, CellColumnFocusVerifyPlugin, ColumnStretchPlugin];
const masterRow = createMasterRowConfig();
const tree = createMasterTreeConfig();
const darkTheme = ref(typeof window !== 'undefined' && currentTheme().isDark());
let disconnectTheme: (() => void) | undefined;

onMounted(() => {
  disconnectTheme = observeCurrentTheme((isDark) => {
    darkTheme.value = isDark;
  });
});

onUnmounted(() => disconnectTheme?.());
</script>
