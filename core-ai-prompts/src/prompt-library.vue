<template>
  <section class="prompt-demo" :class="{ 'is-dark': isDark }">
    <div class="prompt-toolbar">
      <label class="prompt-search"><span>Search</span><input v-model="query" type="search" placeholder="Role, prompt, or tag…" /></label>
      <label><span>Category</span><select v-model="category"><option v-for="item in PROMPT_CATEGORIES" :key="item">{{ item }}</option></select></label>
      <span class="prompt-hint">Double-click a prompt to edit it</span>
    </div>
    <VGrid class="prompt-grid" :theme="isDark ? 'darkCompact' : 'compact'" :source="visibleRows" :columns="PROMPT_COLUMNS" :editors="PROMPT_EDITORS" :filter="true" range resize row-headers hide-attribution can-move-columns :row-size="108" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import VGrid from '@revolist/vue3-datagrid';
import { filterPrompts, PROMPT_CATEGORIES, PROMPT_COLUMNS, PROMPTS } from './prompt-library.shared';
import { PROMPT_EDITORS } from './prompt-editor';
import './prompt-library.css';

defineProps<{ isDark?: boolean }>();
const query = ref('');
const category = ref('All');
const visibleRows = computed(() => filterPrompts(PROMPTS, query.value, category.value));
</script>
