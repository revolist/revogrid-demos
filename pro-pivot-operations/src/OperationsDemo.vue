<template><div ref="host" class="pivot-operations-embed" /></template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { mountOperationsDemo } from './operations-demo';
const host = ref<HTMLElement | null>(null);
let cleanup: (() => void) | undefined;
onMounted(() => { if (host.value) cleanup = mountOperationsDemo(host.value); });
onBeforeUnmount(() => cleanup?.());
</script>
