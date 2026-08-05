<template><div ref="root" class="remote-filter-recipe"></div></template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { mountRemoteFilteringRecipe } from './remote.shared';

const root = ref<HTMLElement | null>(null);
let cleanup: (() => void) | undefined;
onMounted(() => { if (root.value) cleanup = mountRemoteFilteringRecipe(root.value); });
onUnmounted(() => cleanup?.());
</script>
