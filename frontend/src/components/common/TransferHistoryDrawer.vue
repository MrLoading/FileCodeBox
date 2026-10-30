<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SideDrawer from './SideDrawer.vue'
import ReceivedRecordDialogs from './ReceivedRecordDialogs.vue'
import SentRecordDetailModal from './SentRecordDetailModal.vue'
import { useTransferHistory } from '@/composables'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const {
  history,
  formatDate,
  viewRecord,
  removeRecord,
  selectedSentRecord,
  closeSentRecord,
  getQRCodeValue,
  getWgetCommand,
  copyCode,
  copyLink,
  copyWgetCommand,
  selectedRecord,
  previewMediaRecord,
  showPreview,
  showMediaPreview,
  renderedContent,
  closeDetails,
  showContentPreview,
  closeContentPreview,
  copyContent,
  downloadRecord,
  showFilePreview,
  closeFilePreview
} = useTransferHistory()
</script>

<template>
  <SideDrawer visible :title="t('locker.history')" @close="emit('close')">
    <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8">
      <p v-if="!history.length" class="locker-history-empty locker-muted">
        {{ t('locker.emptyHistory') }}
      </p>
      <ol v-else class="locker-history-list">
        <li
          v-for="entry in history"
          :key="`${entry.kind}:${entry.record.id}:${entry.kind === 'sent' ? entry.record.retrieveCode : entry.record.code}`"
          class="locker-history-row"
        >
          <button type="button" class="locker-history-detail" @click="viewRecord(entry)">
            <span class="locker-history-filename">
              {{
                entry.kind === 'received' && entry.record.type === 'text'
                  ? t('locker.text')
                  : entry.record.filename
              }}
            </span>
            <span class="locker-muted">
              <time :datetime="new Date(entry.record.id).toISOString()">{{
                formatDate(entry.record.id)
              }}</time>
              · {{ entry.record.size }}
            </span>
          </button>
          <button
            type="button"
            class="locker-history-remove locker-button"
            @click="removeRecord(entry)"
          >
            {{ t('locker.removeRecord') }}
          </button>
        </li>
      </ol>
    </div>
  </SideDrawer>

  <SentRecordDetailModal
    v-if="selectedSentRecord"
    :record="selectedSentRecord"
    :get-q-r-code-value="getQRCodeValue"
    :command="getWgetCommand(selectedSentRecord)"
    @copy-code="copyCode"
    @copy-link="copyLink"
    @copy-wget="copyWgetCommand"
    @close="closeSentRecord"
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
</template>
