<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowUpIcon, PackageOpenIcon, SendIcon } from 'lucide-vue-next'
import PublicLayout from '@/components/common/PublicLayout.vue'
import { ROUTES } from '@/constants'
const { t } = useI18n()
</script>

<template>
  <PublicLayout>
    <h1 id="locker-home-title" class="locker-home-title">{{ t('locker.homeTitle') }}</h1>
    <nav class="locker-choices" aria-labelledby="locker-home-title">
      <RouterLink :to="ROUTES.SEND" class="locker-choice locker-choice-send">
        <SendIcon :stroke-width="1.5" aria-hidden="true" />
        <strong>{{ t('locker.store') }}</strong>
        <span>{{ t('locker.storeHint') }}</span>
      </RouterLink>
      <RouterLink :to="ROUTES.RETRIEVE" class="locker-choice locker-choice-retrieve">
        <span class="locker-retrieve-icon" aria-hidden="true">
          <ArrowUpIcon class="locker-retrieve-arrow" :stroke-width="2.5" />
          <PackageOpenIcon class="locker-retrieve-box" :stroke-width="1.5" />
        </span>
        <strong>{{ t('locker.retrieve') }}</strong>
        <span>{{ t('locker.retrieveHint') }}</span>
      </RouterLink>
    </nav>
  </PublicLayout>
</template>
