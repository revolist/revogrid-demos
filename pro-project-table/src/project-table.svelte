<!-- src/components/showcase-color/Color.svelte -->
<script lang="ts">
  import { RevoGrid } from '@revolist/svelte-datagrid';
  import { GridPresetPlugin } from '@revolist/revogrid-presets';
  import { COLUMNS_COLOR, PLUGINS_COLOR } from './color.config';
  import { DATA_COLOR } from './color.data';
  import { GROUPING_COLOR } from './color.grouping';
  import { currentTheme } from '../../composables/useRandomData';

  const { isDark } = currentTheme();
  let hiddenColumns: string[] = [];
  const plugins = [GridPresetPlugin, ...PLUGINS_COLOR];

  function toggleHideColumn(e: CustomEvent<string[]>) {
    hiddenColumns = e.detail;
  }
</script>

<div class="flex flex-col gap-4">
  <RevoGrid
    class="skip-style rounded-lg overflow-hidden color-grid cell-border"
    theme={isDark() ? 'darkMaterial' : 'material'}
    columns={COLUMNS_COLOR}
    source={DATA_COLOR}
    grouping={GROUPING_COLOR}
    gridPreset="common-column-types"
    plugins={plugins}
    filter={true}
    hideColumns={hiddenColumns}
    style="height: calc(100vh - 100px)"
    resize
    noHeader
    hideAttribution
    on:toggleHideColumn={toggleHideColumn}
  />
</div> 
