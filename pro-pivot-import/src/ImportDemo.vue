<template><div ref="host" class="pivot-import-embed" /></template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { mountImportDemo } from './import-demo';
const host = ref<HTMLElement | null>(null);
let cleanup: (() => void) | undefined;
onMounted(() => { if (host.value) cleanup = mountImportDemo(host.value); });
onBeforeUnmount(() => cleanup?.());
</script>
