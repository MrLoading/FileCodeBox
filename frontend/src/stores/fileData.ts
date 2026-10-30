import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ReceivedFileRecord, SentFileRecord, TransferHistoryEntry } from '@/types'

export const useFileDataStore = defineStore('fileData', () => {
  const receiveData = ref<ReceivedFileRecord[]>([])
  const shareData = ref<SentFileRecord[]>([])
  const history = computed(() => {
    const entries: TransferHistoryEntry[] = [
      ...shareData.value.map((record) => ({ kind: 'sent' as const, record })),
      ...receiveData.value.map((record) => ({ kind: 'received' as const, record }))
    ]
    // Transfer IDs are the millisecond timestamps of the completed operations.
    return entries.sort((a, b) => b.record.id - a.record.id)
  })

  const addReceiveData = (record: ReceivedFileRecord) => {
    receiveData.value.push(record)
  }

  const removeReceiveData = (id: number) => {
    const index = receiveData.value.findIndex((record) => record.id === id)
    if (index !== -1) {
      receiveData.value.splice(index, 1)
    }
  }

  const deleteReceiveData = (index: number) => {
    if (index >= 0 && index < receiveData.value.length) {
      receiveData.value.splice(index, 1)
    }
  }

  const clearReceiveData = () => {
    receiveData.value = []
  }

  const addShareDataRecord = (record: SentFileRecord) => {
    shareData.value.push(record)
  }

  const deleteShareData = (index: number) => {
    if (index >= 0 && index < shareData.value.length) {
      shareData.value.splice(index, 1)
    }
  }

  const clearShareData = () => {
    shareData.value = []
  }

  return {
    receiveData,
    shareData,
    history,
    addReceiveData,
    removeReceiveData,
    deleteReceiveData,
    clearReceiveData,
    addShareDataRecord,
    deleteShareData,
    clearShareData
  }
})
