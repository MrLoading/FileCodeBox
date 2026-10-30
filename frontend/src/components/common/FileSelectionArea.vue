<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { UploadIcon } from 'lucide-vue-next'
import { getStorageUnit } from '@/utils/convert'

const props = withDefaults(
  defineProps<{
    files: File[]
    disabled?: boolean
    accept?: string
    description?: string
  }>(),
  { disabled: false, accept: '*' }
)
const emit = defineEmits<{ add: [files: File[]]; remove: [index: number]; clear: [] }>()
const { t } = useI18n()
const dragging = ref(false)
const totalSize = computed(() =>
  getStorageUnit(props.files.reduce((size, file) => size + file.size, 0))
)
const choose = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!props.disabled && input.files?.length) emit('add', Array.from(input.files))
  input.value = ''
}
const drag = (event: DragEvent) => {
  if (props.disabled || !event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  dragging.value = true
}
const drop = (event: DragEvent) => {
  event.preventDefault()
  dragging.value = false
  if (!props.disabled && event.dataTransfer?.files.length)
    emit('add', Array.from(event.dataTransfer.files))
}
const leave = (event: DragEvent) => {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    dragging.value = false
}
</script>

<template>
  <div @dragenter="drag" @dragover="drag" @dragleave="leave" @drop="drop">
    <div class="locker-file-picker" :class="{ 'has-files': files.length, 'is-dragging': dragging }">
      <input
        type="file"
        multiple
        :accept="accept"
        :disabled="disabled"
        :aria-label="t(files.length ? 'locker.addFiles' : 'locker.chooseFiles')"
        @change="choose"
      />
      <UploadIcon v-if="!files.length" aria-hidden="true" />
      <span>{{ t(files.length ? 'locker.addFiles' : 'locker.chooseFiles') }}</span>
      <span class="locker-muted">{{ t('locker.dropHint') }}</span>
    </div>
    <p v-if="description" class="locker-file-note">{{ description }}</p>
    <template v-if="files.length">
      <div class="locker-file-summary">
        <span class="locker-muted" role="status" aria-live="polite">{{
          t('locker.selectedFiles', { count: files.length, size: totalSize })
        }}</span>
        <button type="button" class="locker-button" :disabled="disabled" @click="emit('clear')">
          {{ t('locker.clearFiles') }}
        </button>
      </div>
      <ul class="locker-file-list" :aria-label="t('locker.files')">
        <li
          v-for="(file, index) in files"
          :key="`${file.name}:${file.size}:${file.lastModified}:${file.type}`"
          class="locker-file-row"
        >
          <span class="locker-file-info"
            ><span>{{ file.name }}</span
            ><span class="locker-muted">{{ getStorageUnit(file.size) }}</span></span
          >
          <button
            type="button"
            class="locker-button"
            :disabled="disabled"
            :aria-label="t('locker.removeFile', { name: file.name })"
            @click="emit('remove', index)"
          >
            {{ t('common.delete') }}
          </button>
        </li>
      </ul>
      <p v-if="files.length > 1" class="locker-file-note">{{ t('locker.zipHint') }}</p>
    </template>
  </div>
</template>
