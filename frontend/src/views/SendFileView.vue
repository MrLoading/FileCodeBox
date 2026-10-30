<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PublicLayout from '@/components/common/PublicLayout.vue'
import FileSelectionArea from '@/components/common/FileSelectionArea.vue'
import ExpirationSelector from '@/components/common/ExpirationSelector.vue'
import { useSendFlow } from '@/composables'
import { ROUTES } from '@/constants'

const SideDrawer = defineAsyncComponent(() => import('@/components/common/SideDrawer.vue'))
const SentRecordList = defineAsyncComponent(() => import('@/components/common/SentRecordList.vue'))
const SentRecordDetailModal = defineAsyncComponent(
  () => import('@/components/common/SentRecordDetailModal.vue')
)
const { t } = useI18n()
const {
  guestUploadBlocked,
  payloadMode,
  files,
  textContent,
  expirationMethod,
  expirationValue,
  uploadProgress,
  uploadedBytes,
  totalBytes,
  acceptedTypes,
  showDrawer,
  selectedRecord,
  isSubmitting,
  sendRecords,
  uploadDescription,
  expirationOptions,
  closeDetails,
  copySentRecordCode,
  copySentRecordLink,
  copySentRecordWgetCommand,
  deleteRecord,
  getQRCodeValue,
  addFiles,
  removeFile,
  clearFiles,
  handlePaste,
  handleSubmit,
  toggleDrawer,
  viewDetails,
  resetDraft
} = useSendFlow()
onBeforeRouteLeave(() => {
  resetDraft()
})
</script>

<template>
  <PublicLayout @paste="handlePaste">
    <div class="locker-heading">
      <RouterLink class="locker-button" :to="ROUTES.HOME">{{ t('locker.back') }}</RouterLink>
      <h1 class="locker-title">{{ t('locker.store') }}</h1>
    </div>
    <div v-if="guestUploadBlocked">
      <p class="locker-muted">{{ t('send.messages.guestUploadBlockedDesc') }}</p>
      <RouterLink
        class="locker-button"
        :to="{ path: ROUTES.LOGIN, query: { redirect: ROUTES.SEND } }"
        >{{ t('send.messages.guestUploadBlockedAction') }}</RouterLink
      >
    </div>
    <form v-else class="locker-send-form" @submit.prevent="handleSubmit">
      <div class="locker-payload" :data-mode="payloadMode">
        <div class="locker-payload-panel locker-text-panel" :inert="payloadMode === 'file'">
          <label for="text-content" class="locker-label">{{ t('locker.text') }}</label>
          <textarea
            id="text-content"
            v-model="textContent"
            class="locker-field locker-textarea"
            :disabled="isSubmitting"
            :placeholder="t('locker.textPlaceholder')"
          />
        </div>
        <div class="locker-payload-panel locker-file-panel" :inert="payloadMode === 'text'">
          <span class="locker-label">{{ t('locker.files') }}</span>
          <FileSelectionArea
            :files="files"
            :disabled="isSubmitting"
            :accept="acceptedTypes"
            :description="uploadDescription"
            @add="addFiles"
            @remove="removeFile"
            @clear="clearFiles"
          />
        </div>
      </div>
      <ExpirationSelector
        v-model:expiration-method="expirationMethod"
        v-model:expiration-value="expirationValue"
        :options="expirationOptions"
      />
      <div v-if="isSubmitting" role="status" aria-live="polite">
        <span>{{ t('send.submitting') }} {{ uploadProgress }}%</span>
        <progress class="locker-progress" max="100" :value="uploadProgress" />
        <span v-if="totalBytes" class="locker-muted">{{ uploadedBytes }} / {{ totalBytes }} B</span>
      </div>
      <button
        type="submit"
        class="locker-button locker-primary"
        :disabled="isSubmitting || payloadMode === 'empty'"
      >
        {{
          isSubmitting
            ? t('send.submitting')
            : t(files.length > 1 ? 'locker.packAndSend' : 'locker.generateCode')
        }}
      </button>
    </form>
    <div class="locker-history">
      <button class="locker-button" type="button" @click="toggleDrawer">
        {{ t('send.sendRecords') }}
      </button>
    </div>
    <SideDrawer
      v-if="showDrawer"
      :visible="showDrawer"
      :title="t('send.sendRecords')"
      @close="toggleDrawer"
    >
      <SentRecordList
        :records="sendRecords"
        @copy-link="copySentRecordLink"
        @view-details="viewDetails"
        @delete-record="deleteRecord"
      />
    </SideDrawer>
    <SentRecordDetailModal
      v-if="selectedRecord"
      :record="selectedRecord"
      :get-q-r-code-value="getQRCodeValue"
      @close="closeDetails"
      @copy-code="copySentRecordCode"
      @copy-link="copySentRecordLink"
      @copy-wget="copySentRecordWgetCommand"
    />
  </PublicLayout>
</template>
