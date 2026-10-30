import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import type { ReceivedFileRecord, ShareMetadataResponse, ShareSelectResponse } from '@/types'
import { getErrorMessage, getResponseMessage } from '@/utils/common'
import { getStorageUnit } from '@/utils/convert'
import { useReceivedRecordDetails } from './useReceivedRecordDetails'

type InputStatus = {
  readonly: boolean
  loading: boolean
}

export function useRetrieveFlow() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const fileStore = useFileDataStore()

  const code = ref('')
  const inspectedFile = ref<ShareMetadataResponse | null>(null)
  const isInspecting = ref(false)
  const isRetrieving = ref(false)
  const inputStatus = ref<InputStatus>({
    readonly: false,
    loading: false
  })
  const error = ref('')
  const details = useReceivedRecordDetails()
  const normalizedCode = computed(() => code.value.trim())
  const isWorking = computed(() => isInspecting.value || isRetrieving.value)
  const canSubmit = computed(() => !isWorking.value && Array.from(normalizedCode.value).length >= 5)
  let generation = 0
  let pending: AbortController | null = null
  const resetDraft = () => {
    generation++
    pending?.abort()
    pending = null
    code.value = ''
    inspectedFile.value = null
    details.closeDetails()
    isInspecting.value = isRetrieving.value = false
    inputStatus.value = { readonly: false, loading: false }
    error.value = ''
  }
  onScopeDispose(resetDraft)

  const createRecord = (detail: ShareSelectResponse): ReceivedFileRecord => {
    const isText =
      typeof detail.is_text === 'boolean'
        ? detail.is_text
        : detail.type
          ? detail.type === 'text'
          : detail.name === 'Text' && !detail.text.startsWith('/share/download')
    const content = isText ? (detail.content ?? detail.text) : null
    const downloadUrl = isText ? null : (detail.download_url ?? detail.text)

    return {
      id: Date.now(),
      code: detail.code,
      filename: detail.name,
      size: getStorageUnit(detail.size),
      downloadUrl,
      content,
      date: new Date().toLocaleString(),
      type: isText ? 'text' : 'file'
    }
  }

  const resetInspection = () => {
    inspectedFile.value = null
    error.value = ''
  }

  const inspectCode = async () => {
    if (!normalizedCode.value) {
      alertStore.showAlert(t('retrieve.messages.invalidCode'), 'error')
      return
    }

    isInspecting.value = true
    inputStatus.value.readonly = true
    inputStatus.value.loading = true
    error.value = ''

    try {
      const res = await FileService.inspectFile(normalizedCode.value)
      if (res.code === 200 && res.detail) {
        inspectedFile.value = res.detail
      } else {
        inspectedFile.value = null
        error.value = getResponseMessage(res, t('retrieve.messages.unknownError'))
        alertStore.showAlert(t('retrieve.messages.retrieveFailure') + error.value, 'error')
      }
    } catch {
      inspectedFile.value = null
      error.value = t('retrieve.messages.previewUnavailable')
      alertStore.showAlert(error.value, 'warning')
    } finally {
      isInspecting.value = false
      inputStatus.value.readonly = false
      inputStatus.value.loading = false
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit.value) return

    isRetrieving.value = true
    inputStatus.value.readonly = true
    inputStatus.value.loading = true
    error.value = ''
    const version = generation
    pending = new AbortController()

    try {
      const res = await FileService.selectFile(normalizedCode.value, pending.signal)
      if (version !== generation) return
      if (res.code === 200 && res.detail) {
        const newFileData = createRecord(res.detail)
        const existingIndex = fileStore.receiveData.findIndex(
          (file) => file.code === newFileData.code
        )
        if (existingIndex !== -1) {
          fileStore.deleteReceiveData(existingIndex)
        }
        fileStore.addReceiveData(newFileData)
        details.viewDetails(newFileData, true)
        inspectedFile.value = null
        alertStore.showAlert(t('retrieve.messages.retrieveSuccess'), 'success')
      } else {
        error.value = getResponseMessage(res, t('retrieve.messages.unknownError'))
        alertStore.showAlert(t('retrieve.messages.retrieveFailure') + error.value, 'error')
      }
    } catch (err: unknown) {
      if (version !== generation) return
      const errorMessage = getErrorMessage(err, t('retrieve.messages.unknownError'))
      error.value = errorMessage
      alertStore.showAlert(t('retrieve.messages.networkError') + errorMessage, 'error')
    } finally {
      if (version === generation) {
        pending = null
        isRetrieving.value = false
        inputStatus.value.readonly = false
        inputStatus.value.loading = false
      }
    }
  }

  watch(
    code,
    () => {
      if (inspectedFile.value && inspectedFile.value.code !== normalizedCode.value) {
        inspectedFile.value = null
      }
      error.value = ''
    },
    { flush: 'sync' }
  )

  return {
    resetDraft,
    code,
    inspectedFile,
    isInspecting,
    isRetrieving,
    isWorking,
    canSubmit,
    inputStatus,
    error,
    handleSubmit,
    inspectCode,
    resetInspection,
    ...details
  }
}
