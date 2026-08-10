<template>
  <section class="portfolio-demo" :class="{ 'is-dark': isDark }">
    <div class="portfolio-toolbar">
      <div class="portfolio-grouping"><span>Grouped by</span><strong>Department → Status</strong></div>
      <button class="portfolio-toggle" type="button" :aria-label="expanded ? 'Collapse all groups' : 'Expand all groups'" :title="expanded ? 'Collapse all groups' : 'Expand all groups'" @click="expanded = !expanded">
        <i class="fa-solid" :class="expanded ? 'fa-angles-up' : 'fa-angles-down'" aria-hidden="true"></i>
      </button>
    </div>
    <VGrid class="portfolio-grid" :theme="isDark ? 'darkCompact' : 'compact'" :source="PROJECTS" :columns="PROJECT_COLUMNS" :grouping="createGrouping(expanded)" :filter="true" range resize hide-attribution can-move-columns :row-size="44" />
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'; import VGrid from '@revolist/vue3-datagrid'; import { createGrouping, PROJECT_COLUMNS, PROJECTS } from './project-portfolio.shared'; import '@fortawesome/fontawesome-free/css/all.min.css'; import './project-portfolio.css';
defineProps<{ isDark?: boolean }>(); const expanded = ref(true);
</script>
