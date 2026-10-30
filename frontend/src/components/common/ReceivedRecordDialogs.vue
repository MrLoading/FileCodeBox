<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { ReceivedFileRecord } from '@/types'

const FileDetailModal = defineAsyncComponent(() => import('./FileDetailModal.vue'))
const ContentPreviewModal = defineAsyncComponent(() => import('./ContentPreviewModal.vue'))
const MediaPreviewModal = defineAsyncComponent(() => import('./MediaPreviewModal.vue'))

defineProps<{
  selectedRecord: ReceivedFileRecord | null
  previewMediaRecord: ReceivedFileRecord | null
  showPreview: boolean
  showMediaPreview: boolean
  renderedContent: string
}>()

const emit = defineEmits<{
  closeDetails: []
  previewContent: []
  closeContent: []
  copyContent: []
  downloadText: []
  previewFile: []
  closeFile: []
}>()
</script>

<template>
  <FileDetailModal
    v-if="selectedRecord && !showPreview && !showMediaPreview"
    visible
    :record="selectedRecord"
    @close="emit('closeDetails')"
    @preview-content="emit('previewContent')"
    @download-text="emit('downloadText')"
    @preview-file="emit('previewFile')"
  />
  <ContentPreviewModal
    v-if="showPreview"
    :visible="showPreview"
    :rendered-content="renderedContent"
    @close="emit('closeContent')"
    @copy-content="emit('copyContent')"
  />
  <MediaPreviewModal
    v-if="showMediaPreview"
    :visible="showMediaPreview"
    :record="previewMediaRecord"
    @close="emit('closeFile')"
  />
</template>
