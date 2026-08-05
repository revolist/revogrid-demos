<template>
  <section class="row-master-showcase" aria-label="Row Master portfolio explorer">
    <div class="row-master-toolbar">
      <div>
        <strong>Portfolio explorer</strong>
        <span>Expand a leaf initiative to open its virtualized master-detail workspace.</span>
      </div>
      <div class="row-master-toolbar__badge">Tree + master detail</div>
    </div>
    <RevoGrid
      class="row-master-grid"
      :theme="darkTheme ? 'darkMaterial' : 'material'"
      :source="rows"
      :columns="columns"
      :plugins="plugins"
      :master-row.prop="masterRow"
      :tree.prop="tree"
      stretch="last"
      hide-attribution
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import RevoGrid from '@revolist/vue3-datagrid';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  prefersDarkTheme,
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

const props = defineProps<{ rows?: MasterProjectRow[] }>();
const rows = ref(props.rows?.length ? props.rows : createMasterRows());
const columns = createMasterColumns(rows.value);
const plugins = [TreeDataPlugin, MasterRowPlugin, CellColumnFocusVerifyPlugin, ColumnStretchPlugin];
const masterRow = createMasterRowConfig();
const tree = createMasterTreeConfig();
const darkTheme = ref(prefersDarkTheme());
</script>
