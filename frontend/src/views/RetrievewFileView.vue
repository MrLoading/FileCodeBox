<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import PublicLayout from '@/components/common/PublicLayout.vue'
import RetrieveForm from '@/components/common/RetrieveForm.vue'
import ReceivedRecordDialogs from '@/components/common/ReceivedRecordDialogs.vue'
import { useRetrieveFlow } from '@/composables'
import { ROUTES } from '@/constants'

const { t } = useI18n()
const route = useRoute()
const {
  code,
  canSubmit,
  inputStatus,
  error,
  selectedRecord,
  previewMediaRecord,
  showPreview,
  showMediaPreview,
  renderedContent,
  closeContentPreview,
  closeFilePreview,
  closeDetails,
  copyContent,
  downloadRecord,
  handleSubmit,
  showContentPreview,
  showFilePreview,
  resetDraft
} = useRetrieveFlow()

const prefill = route.query.code
if (typeof prefill === 'string') code.value = prefill
onBeforeRouteLeave(() => {
  resetDraft()
})
</script>

<template>
  <PublicLayout narrow>
    <div class="locker-heading">
      <RouterLink class="locker-button" :to="ROUTES.HOME">{{ t('locker.back') }}</RouterLink>
      <h1 class="locker-title">{{ t('locker.retrieve') }}</h1>
    </div>
    <RetrieveForm
      v-model="code"
      :can-submit="canSubmit"
      :input-status="inputStatus"
      :error="error"
      @submit="handleSubmit"
    />
    <ReceivedRecordDialogs
      :selected-record="selectedRecord"
      :preview-media-record="previewMediaRecord"
      :show-preview="showPreview"
      :show-media-preview="showMediaPreview"
      :rendered-content="renderedContent"
      @close-details="closeDetails"
      @preview-content="showContentPreview"
      @close-content="closeContentPreview"
      @copy-content="copyContent"
      @download-text="downloadRecord"
      @preview-file="showFilePreview"
      @close-file="closeFilePreview"
    />
  </PublicLayout>
</template>
