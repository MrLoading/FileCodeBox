<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import PublicLayout from '@/components/common/PublicLayout.vue'
import RetrieveForm from '@/components/common/RetrieveForm.vue'
import { useRetrieveFlow } from '@/composables'
import { ROUTES } from '@/constants'

const SideDrawer = defineAsyncComponent(() => import('@/components/common/SideDrawer.vue'))
const FileRecordList = defineAsyncComponent(() => import('@/components/common/FileRecordList.vue'))
const FileDetailModal = defineAsyncComponent(
  () => import('@/components/common/FileDetailModal.vue')
)
const ContentPreviewModal = defineAsyncComponent(
  () => import('@/components/common/ContentPreviewModal.vue')
)
const MediaPreviewModal = defineAsyncComponent(
  () => import('@/components/common/MediaPreviewModal.vue')
)
const { t } = useI18n()
const route = useRoute()
const {
  code,
  inputStatus,
  error,
  records,
  selectedRecord,
  previewMediaRecord,
  showDrawer,
  showPreview,
  showMediaPreview,
  renderedContent,
  closeContentPreview,
  closeFilePreview,
  closeDetails,
  copyContent,
  deleteRecord,
  downloadRecord,
  handleSubmit,
  showContentPreview,
  showFilePreview,
  toggleDrawer,
  viewDetails,
  resetDraft
} = useRetrieveFlow()
onMounted(() => {
  if (typeof route.query.code === 'string') code.value = route.query.code
})
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
      :input-status="inputStatus"
      :error="!!error"
      @submit="handleSubmit"
    />
    <p v-if="error" role="alert" class="locker-error">{{ error }}</p>
    <div class="locker-history">
      <button class="locker-button" type="button" @click="toggleDrawer">
        {{ t('retrieve.recordsDrawer') }}
      </button>
    </div>
    <SideDrawer
      v-if="showDrawer"
      :visible="showDrawer"
      :title="t('retrieve.recordsDrawer')"
      @close="toggleDrawer"
    >
      <FileRecordList
        :records="records"
        @view-details="viewDetails"
        @download-record="downloadRecord"
        @delete-record="deleteRecord"
      />
    </SideDrawer>
    <FileDetailModal
      v-if="selectedRecord && !showPreview && !showMediaPreview"
      :visible="!!selectedRecord"
      :record="selectedRecord"
      @close="closeDetails"
      @preview-content="showContentPreview"
      @preview-file="showFilePreview"
    />
    <ContentPreviewModal
      v-if="showPreview"
      :visible="showPreview"
      :rendered-content="renderedContent"
      @close="closeContentPreview"
      @copy-content="copyContent"
    />
    <MediaPreviewModal
      v-if="showMediaPreview"
      :visible="showMediaPreview"
      :record="previewMediaRecord"
      @close="closeFilePreview"
    />
  </PublicLayout>
</template>
