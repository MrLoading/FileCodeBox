import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlertStore } from '@/stores/alertStore'
import { useFileDataStore } from '@/stores/fileData'
import type { SentFileRecord, TransferHistoryEntry } from '@/types'
import { createSentRecordActions } from '@/utils/sent-record-actions'
import { useReceivedRecordDetails } from './useReceivedRecordDetails'

export function useTransferHistory() {
  const { locale, t } = useI18n()
  const alerts = useAlertStore()
  const transfers = useFileDataStore()
  const selectedSentRecord = ref<SentFileRecord | null>(null)
  const received = useReceivedRecordDetails()
  const dateFormat = computed(
    () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'medium' })
  )

  const viewRecord = (entry: TransferHistoryEntry) => {
    if (entry.kind === 'sent') {
      received.closeDetails()
      selectedSentRecord.value = entry.record
    } else {
      selectedSentRecord.value = null
      received.viewDetails(entry.record)
    }
  }

  const removeRecord = (entry: TransferHistoryEntry) => {
    if (entry.kind === 'sent') {
      transfers.deleteShareData(transfers.shareData.indexOf(entry.record))
    } else {
      transfers.deleteReceiveData(transfers.receiveData.indexOf(entry.record))
    }
  }

  return {
    history: computed(() => transfers.history),
    formatDate: (timestamp: number) => dateFormat.value.format(timestamp),
    viewRecord,
    removeRecord,
    selectedSentRecord,
    closeSentRecord: () => {
      selectedSentRecord.value = null
    },
    ...createSentRecordActions(alerts.showAlert, t),
    ...received
  }
}
