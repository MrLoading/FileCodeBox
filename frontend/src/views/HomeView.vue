<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PackagePlusIcon, PackageOpenIcon } from 'lucide-vue-next'
import PublicLayout from '@/components/common/PublicLayout.vue'
import { ROUTES } from '@/constants'
const { t } = useI18n()
</script>

<template>
  <PublicLayout>
    <h1 class="locker-title">{{ t('locker.homeTitle') }}</h1>
    <nav class="locker-choices" :aria-label="t('locker.homeTitle')">
      <RouterLink :to="ROUTES.SEND" class="locker-choice">
        <PackagePlusIcon aria-hidden="true" />
        <strong>{{ t('locker.store') }}</strong>
        <span>{{ t('locker.storeHint') }}</span>
      </RouterLink>
      <RouterLink :to="ROUTES.RETRIEVE" class="locker-choice">
        <PackageOpenIcon aria-hidden="true" />
        <strong>{{ t('locker.retrieve') }}</strong>
        <span>{{ t('locker.retrieveHint') }}</span>
      </RouterLink>
    </nav>
  </PublicLayout>
</template>
