<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { watchEffect } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import '@/assets/style/public.css'

withDefaults(defineProps<{ narrow?: boolean }>(), { narrow: false })
const { config } = storeToRefs(useConfigStore())
watchEffect(() => {
  document.title = config.value.name || 'FileCodeBox'
})
</script>

<template>
  <div class="locker-page" :class="{ 'locker-page-narrow': narrow }">
    <header class="locker-header">
      <span class="locker-brand">{{ config.name || 'FileCodeBox' }}</span>
    </header>
    <main class="locker-main">
      <section class="locker-content" :class="{ 'locker-content-narrow': narrow }">
        <slot />
      </section>
    </main>
    <footer class="locker-footer">FileCodeBox</footer>
  </div>
</template>
