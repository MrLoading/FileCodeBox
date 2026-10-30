import { computed, nextTick, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlertStore } from '@/stores/alertStore'
import { useAdminStore } from '@/stores/adminStore'
import { useConfigStore } from '@/stores/configStore'
import { useFileDataStore } from '@/stores/fileData'
import type { SendType, SentFileRecord, UploadProgress } from '@/types'
import { getErrorMessage } from '@/utils/common'
import { getStorageUnit } from '@/utils/convert'
import { buildSentRecord, isExpirationWithinLimit } from '@/utils/send-record'
import { createSentRecordActions } from '@/utils/sent-record-actions'
import { useSendSubmit } from './useSendSubmit'

export function useSendFlow() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const adminStore = useAdminStore()
  const configStore = useConfigStore()
  const fileDataStore = useFileDataStore()
  const config = computed(() => configStore.config)
  const sendType = ref<SendType>('file')
  const selectedFile = ref<File | null>(null)
  const selectedFiles = ref<File[]>([])
  const textContent = ref('')
  const expirationMethod = ref(config.value.expire_style[0] || 'day')
  const expirationValue = ref('1')
  const uploadProgress = ref(0)
  const uploadedBytes = ref(0)
  const totalBytes = ref(0)
  const uploadSpeed = ref(0)
  const showDrawer = ref(false)
  const selectedRecord = ref<SentFileRecord | null>(null)
  const isSubmitting = ref(false)
  const sendRecords = computed(() => fileDataStore.shareData)
  const files = computed(() =>
    selectedFiles.value.length
      ? selectedFiles.value
      : selectedFile.value
        ? [selectedFile.value]
        : []
  )
  const payloadMode = computed(() =>
    textContent.value.trim() ? 'text' : files.value.length ? 'file' : 'empty'
  )
  const guestUploadBlocked = computed(() => config.value.open_upload === 0 && !adminStore.hasToken)
  const uploadDescription = computed(() =>
    t('send.uploadArea.descriptionWithLimit', { size: getStorageUnit(config.value.upload_size) })
  )
  let generation = 0
  let disposed = false
  let lastProgress = { loaded: 0, time: 0 }
  const notify = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (!disposed) alertStore.showAlert(message, type)
  }
  const actions = createSentRecordActions(notify)
  const { resetPresignUpload, cancelPending, submitFile, submitText } = useSendSubmit({
    getMaxFileSize: () => configStore.uploadSizeLimit,
    notify,
    translate: t,
    onHashCalculated: () => {},
    onProgress: (progress: UploadProgress) => {
      if (disposed) return
      const now = performance.now()
      uploadSpeed.value =
        lastProgress.time && now > lastProgress.time
          ? (Math.max(0, progress.loaded - lastProgress.loaded) * 1000) / (now - lastProgress.time)
          : 0
      lastProgress = { loaded: progress.loaded, time: now }
      uploadedBytes.value = progress.loaded
      totalBytes.value = progress.total
      uploadProgress.value = progress.percentage
    }
  })
  const getUnit = (value: string) =>
    t(
      `send.expiration.units.${({ day: 'days', hour: 'hours', minute: 'minutes', count: 'times', forever: 'forever' } as Record<string, string>)[value] || value}`
    )
  const expirationOptions = computed(() =>
    config.value.expire_style.map((value) => ({ value, label: getUnit(value) }))
  )
  const allowedFileTypes = computed(() =>
    (config.value.allowed_file_types || ['*'])
      .map(String)
      .map((value) => value.trim())
      .filter(Boolean)
  )
  const acceptedTypes = computed(() =>
    allowedFileTypes.value.some((type) => type === '*' || type === '*/*')
      ? '*'
      : allowedFileTypes.value
          .map((type) => (type.includes('/') || type.startsWith('.') ? type : `.${type}`))
          .join(',')
  )
  watch(
    () => config.value.expire_style,
    (styles) => {
      if (styles.length && !styles.includes(expirationMethod.value))
        expirationMethod.value = styles[0]
    }
  )
  const clearFiles = () => {
    selectedFile.value = null
    selectedFiles.value = []
  }
  const setFiles = (next: File[]) => {
    selectedFile.value = next.length === 1 ? next[0] : null
    selectedFiles.value = next.length > 1 ? next : []
  }
  watch(
    textContent,
    (value) => {
      if (value.trim()) {
        clearFiles()
        sendType.value = 'text'
      } else sendType.value = 'file'
    },
    { flush: 'sync' }
  )
  const checkOpenUpload = () => {
    if (!guestUploadBlocked.value) return true
    notify(t('send.messages.guestUploadDisabled'), 'error')
    return false
  }
  const checkFileSize = (file: File) => {
    if (file.size <= config.value.upload_size) return true
    notify(
      t('send.messages.fileSizeExceeded', { size: getStorageUnit(config.value.upload_size) }),
      'error'
    )
    return false
  }
  const checkFileType = (file: File) => {
    const allowed =
      !allowedFileTypes.value.length ||
      allowedFileTypes.value.some((type) => {
        const rule = type.toLowerCase()
        if (rule === '*' || rule === '*/*') return true
        if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
        return rule.includes('/')
          ? file.type.toLowerCase() === rule
          : file.name.toLowerCase().endsWith(rule.startsWith('.') ? rule : `.${rule}`)
      })
    if (!allowed)
      notify(
        t('send.messages.fileTypeNotAllowed', { types: allowedFileTypes.value.join(', ') }),
        'error'
      )
    return allowed
  }
  const addFiles = (incoming: File[]) => {
    if (disposed || isSubmitting.value || !incoming.length || !checkOpenUpload()) return
    if (incoming.some((file) => !checkFileSize(file) || !checkFileType(file))) return
    const key = (file: File) => JSON.stringify([file.name, file.size, file.lastModified, file.type])
    const merged = [...files.value]
    const keys = new Set(merged.map(key))
    for (const file of incoming)
      if (!keys.has(key(file))) {
        merged.push(file)
        keys.add(key(file))
      }
    textContent.value = ''
    sendType.value = 'file'
    setFiles(merged)
  }
  const removeFile = (index: number) => {
    if (!isSubmitting.value) setFiles(files.value.filter((_, i) => i !== index))
  }
  const handlePaste = (event: ClipboardEvent) => {
    if (isSubmitting.value) return
    if (event.target instanceof HTMLInputElement) return
    if (event.clipboardData?.files.length) {
      event.preventDefault()
      addFiles(Array.from(event.clipboardData.files))
    } else if (!(event.target instanceof HTMLTextAreaElement)) {
      const text = event.clipboardData?.getData('text')
      if (!text?.trim() || files.value.length) return
      event.preventDefault()
      textContent.value = text
      void nextTick(() => document.getElementById('text-content')?.focus())
    }
  }
  const resetUploadProgress = () => {
    uploadProgress.value = uploadedBytes.value = totalBytes.value = uploadSpeed.value = 0
    lastProgress = { loaded: 0, time: 0 }
  }
  const resetDraft = () => {
    generation++
    cancelPending()
    clearFiles()
    textContent.value = ''
    sendType.value = 'file'
    expirationMethod.value = config.value.expire_style[0] || 'day'
    expirationValue.value = '1'
    selectedRecord.value = null
    showDrawer.value = false
    isSubmitting.value = false
    resetUploadProgress()
  }
  onScopeDispose(() => {
    disposed = true
    resetDraft()
  })
  const handleSubmit = async () => {
    if (isSubmitting.value || disposed || !checkOpenUpload()) return
    if (payloadMode.value === 'empty') return
    if (
      !isExpirationWithinLimit(
        expirationMethod.value,
        expirationValue.value,
        config.value.max_save_seconds || 0
      )
    ) {
      notify(
        t('send.messages.expirationTooLong', {
          days: Math.floor(config.value.max_save_seconds / 86400)
        }),
        'error'
      )
      return
    }
    const version = generation
    const snapshot = {
      sendType: sendType.value,
      textContent: textContent.value,
      selectedFile: selectedFile.value,
      selectedFiles: [...selectedFiles.value],
      expirationMethod: expirationMethod.value,
      expirationValue: expirationValue.value
    }
    isSubmitting.value = true
    try {
      const expireValue = Number.parseInt(snapshot.expirationValue) || 1
      const response =
        snapshot.sendType === 'file'
          ? await submitFile({
              selectedFile: snapshot.selectedFile,
              selectedFiles: snapshot.selectedFiles,
              expireValue,
              expire_style: snapshot.expirationMethod,
              enable_chunk: Boolean(config.value.enable_chunk),
              validateFileSize: checkFileSize
            })
          : await submitText({
              text: snapshot.textContent,
              expireValue,
              expire_style: snapshot.expirationMethod
            })
      if (disposed || version !== generation || !response) return
      if (response.code !== 200) throw new Error(t('send.messages.serverError'))
      const record = buildSentRecord({ response, ...snapshot, translate: t, getUnit })
      fileDataStore.addShareDataRecord(record)
      clearFiles()
      textContent.value = ''
      selectedRecord.value = record
      resetPresignUpload()
      notify(t('send.messages.sendSuccess', { code: record.retrieveCode }), 'success')
    } catch (error) {
      if (!disposed && version === generation)
        notify(getErrorMessage(error, t('send.messages.sendFailed')), 'error')
    } finally {
      if (version === generation) {
        isSubmitting.value = false
        resetUploadProgress()
      }
    }
  }
  return {
    config,
    guestUploadBlocked,
    sendType,
    selectedFile,
    selectedFiles,
    textContent,
    files,
    payloadMode,
    expirationMethod,
    expirationValue,
    expirationOptions,
    uploadProgress,
    uploadedBytes,
    totalBytes,
    uploadSpeed,
    acceptedTypes,
    uploadDescription,
    isSubmitting,
    selectedRecord,
    showDrawer,
    sendRecords,
    addFiles,
    removeFile,
    clearFiles,
    handlePaste,
    handleSubmit,
    resetDraft,
    closeDetails: () => {
      selectedRecord.value = null
    },
    toggleDrawer: () => {
      showDrawer.value = !showDrawer.value
    },
    viewDetails: (record: SentFileRecord) => {
      selectedRecord.value = record
    },
    deleteRecord: (id: number) => {
      const index = fileDataStore.shareData.findIndex((record) => record.id === id)
      if (index !== -1) fileDataStore.deleteShareData(index)
    },
    copySentRecordCode: actions.copyCode,
    copySentRecordLink: actions.copyLink,
    copySentRecordWgetCommand: actions.copyWgetCommand,
    getQRCodeValue: actions.getQRCodeValue
  }
}
