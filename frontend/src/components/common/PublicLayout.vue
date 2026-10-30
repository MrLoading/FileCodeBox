<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { defineAsyncComponent, nextTick, ref, useTemplateRef, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfigStore } from '@/stores/configStore'
import '@/assets/style/public.css'

withDefaults(defineProps<{ narrow?: boolean }>(), { narrow: false })
const { t } = useI18n()
const { config } = storeToRefs(useConfigStore())
const TransferHistoryDrawer = defineAsyncComponent(() => import('./TransferHistoryDrawer.vue'))
const showHistory = ref(false)
const historyTrigger = useTemplateRef('historyTrigger')
const closeHistory = async () => {
  showHistory.value = false
  await nextTick()
  historyTrigger.value?.focus({ preventScroll: true })
}
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
    <footer class="locker-footer">
      <span>FileCodeBox</span>
      <button
        ref="historyTrigger"
        class="locker-footer-link"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="showHistory"
        @click="showHistory = true"
      >
        {{ t('locker.history') }}
      </button>
    </footer>
    <TransferHistoryDrawer v-if="showHistory" @close="closeHistory" />
  </div>
</template>
