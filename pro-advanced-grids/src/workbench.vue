<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { mountWorkbench } from './workbench';

const host = ref<HTMLElement>();
let dispose: (() => void) | undefined;
onMounted(() => {
  if (host.value) dispose = mountWorkbench(host.value);
});
onUnmounted(() => dispose?.());
</script>

<template><div ref="host" class="workbench-host"></div></template>
