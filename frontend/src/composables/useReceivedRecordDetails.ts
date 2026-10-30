import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlertStore } from '@/stores/alertStore'
import type { ReceivedFileRecord } from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import { getErrorMessage } from '@/utils/common'
import { renderMarkdownPreview } from '@/utils/content-preview'
import { downloadReceivedRecord } from '@/utils/download-action'

export function useReceivedRecordDetails() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const selectedRecord = ref<ReceivedFileRecord | null>(null)
  const previewMediaRecord = ref<ReceivedFileRecord | null>(null)
  const showPreview = ref(false)
  const renderedContent = ref('')

  const viewDetails = (record: ReceivedFileRecord, previewText = false) => {
    selectedRecord.value = record
    previewMediaRecord.value = null
    showPreview.value = previewText && !!record.content
  }

  const closeDetails = () => {
    selectedRecord.value = previewMediaRecord.value = null
    showPreview.value = false
  }

  const copyContent = async () => {
    if (selectedRecord.value?.content) {
      await copyToClipboard(selectedRecord.value.content, {
        successMsg: t('fileRecord.contentCopied'),
        errorMsg: t('fileRecord.copyFailed'),
        notify: (message, type) => alertStore.showAlert(message, type)
      })
    }
  }

  const downloadRecord = async () => {
    if (!selectedRecord.value) return
    try {
      await downloadReceivedRecord(selectedRecord.value)
    } catch (error) {
      alertStore.showAlert(getErrorMessage(error, t('common.downloadFailed')), 'error')
    }
  }

  watch(
    () => selectedRecord.value?.content,
    async (content, _previous, onCleanup) => {
      renderedContent.value = ''
      if (!content) return
      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })
      const html = await renderMarkdownPreview(content)
      if (!cancelled) renderedContent.value = html
    }
  )

  return {
    selectedRecord,
    previewMediaRecord,
    showPreview,
    showMediaPreview: computed(() => previewMediaRecord.value !== null),
    renderedContent,
    viewDetails,
    closeDetails,
    copyContent,
    downloadRecord,
    showContentPreview: () => {
      showPreview.value = true
    },
    closeContentPreview: () => {
      showPreview.value = false
    },
    showFilePreview: () => {
      previewMediaRecord.value = selectedRecord.value
    },
    closeFilePreview: () => {
      previewMediaRecord.value = null
    }
  }
}
