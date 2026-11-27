<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { mountAdvancedGrid } from './demo-entry';
const props = defineProps<{ exampleId: string }>();
const host = ref<HTMLElement>();
let dispose: (() => void) | undefined;
onMounted(() => { if (host.value) dispose = mountAdvancedGrid(host.value, props.exampleId); });
onUnmounted(() => dispose?.());
</script>
<template><div ref="host" class="workbench-host"></div></template>
