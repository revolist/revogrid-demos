<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { mountForecast } from './forecast';

const host = ref<HTMLElement>();
let dispose: (() => void) | undefined;
onMounted(() => {
  if (host.value) dispose = mountForecast(host.value);
});
onUnmounted(() => dispose?.());
</script>

<template><div ref="host" class="forecast-host"></div></template>
