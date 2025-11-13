<template>
  <div id="app">
    <WebGLPlayground />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import WebGLPlayground from './views/WebGLPlayground.vue'

console.log('App.vue script setup running...')

onMounted(() => {
  console.log('App.vue mounted!')
})
</script>
