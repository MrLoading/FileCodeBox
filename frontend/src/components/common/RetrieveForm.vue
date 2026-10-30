<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { DeleteIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const model = defineModel<string>({ required: true })
const props = defineProps<{
  inputStatus: { readonly: boolean; loading: boolean }
  error: string
  canSubmit: boolean
}>()
const emit = defineEmits<{ submit: [] }>()
const { t } = useI18n()
const input = useTemplateRef('codeInput')
const keypadToggle = useTemplateRef('keypadToggle')
const showLetters = ref(false)
const letterRows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL']
const locked = computed(() => props.inputStatus.readonly || props.inputStatus.loading)

const moveCaretToEnd = () => {
  const field = input.value
  if (!field) return

  const end = field.value.length
  if (field.selectionStart !== end || field.selectionEnd !== end) {
    field.setSelectionRange(end, end)
  }
  field.scrollLeft = field.scrollWidth
}

const setCode = (value: string) => {
  const field = input.value
  if (!field || locked.value) return

  const code = value.replace(/[a-z]/g, (letter) => letter.toUpperCase())
  if (field.value !== code) field.value = code
  model.value = code
  moveCaretToEnd()
}

const onInput = (event: Event) => {
  if (!(event as InputEvent).isComposing && input.value) setCode(input.value.value)
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) return
  if (
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) ||
    ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a')
  ) {
    event.preventDefault()
    moveCaretToEnd()
  }
}

const toggleKeypad = async (event: MouseEvent) => {
  showLetters.value = !showLetters.value
  await nextTick()
  if (event.detail === 0) keypadToggle.value?.focus({ preventScroll: true })
}

const append = (key: string) => setCode(model.value + key)
const erase = () => setCode(Array.from(model.value).slice(0, -1).join(''))

onMounted(moveCaretToEnd)
watch(model, moveCaretToEnd, { flush: 'post' })
</script>

<template>
  <form class="locker-retrieve-form" @submit.prevent="canSubmit && emit('submit')">
    <label class="locker-label" for="retrieve-code">{{ t('locker.codeLabel') }}</label>
    <input
      id="retrieve-code"
      ref="codeInput"
      :value="model"
      class="locker-field locker-code-field"
      type="text"
      inputmode="none"
      autocomplete="one-time-code"
      autocapitalize="characters"
      spellcheck="false"
      :readonly="locked"
      :aria-invalid="!!error"
      :aria-describedby="error ? 'retrieve-error' : undefined"
      @input="onInput"
      @compositionend="onInput"
      @beforeinput="!$event.isComposing && moveCaretToEnd()"
      @keydown="onKeydown"
      @focus="moveCaretToEnd"
      @click="moveCaretToEnd"
      @select="moveCaretToEnd"
    />
    <p v-if="error" id="retrieve-error" role="alert" class="locker-error">{{ error }}</p>

    <div
      v-if="!showLetters"
      class="locker-keypad"
      role="group"
      :aria-label="t('locker.numericKeypad')"
    >
      <button
        v-for="digit in 9"
        :key="digit"
        class="locker-key"
        type="button"
        :disabled="locked"
        @click="append(String(digit))"
      >
        {{ digit }}
      </button>
      <button
        ref="keypadToggle"
        class="locker-key locker-key-secondary"
        type="button"
        :disabled="locked"
        :aria-label="t('locker.switchToLetters')"
        @click="toggleKeypad"
      >
        ABC
      </button>
      <button class="locker-key" type="button" :disabled="locked" @click="append('0')">0</button>
      <button
        class="locker-key locker-key-icon"
        type="button"
        :disabled="locked"
        :aria-label="t('locker.backspace')"
        @click="erase"
      >
        <DeleteIcon :size="22" aria-hidden="true" />
      </button>
    </div>
    <div v-else class="locker-keypad-alpha" role="group" :aria-label="t('locker.letterKeypad')">
      <div v-for="row in letterRows" :key="row" class="locker-keypad-row">
        <button
          v-for="key in row.split('')"
          :key="key"
          class="locker-key"
          type="button"
          :disabled="locked"
          @click="append(key)"
        >
          {{ key }}
        </button>
      </div>
      <div class="locker-keypad-row">
        <button
          ref="keypadToggle"
          class="locker-key locker-key-secondary locker-key-wide"
          type="button"
          :disabled="locked"
          :aria-label="t('locker.switchToNumbers')"
          @click="toggleKeypad"
        >
          123
        </button>
        <button
          v-for="key in 'ZXCVBNM'.split('')"
          :key="key"
          class="locker-key"
          type="button"
          :disabled="locked"
          @click="append(key)"
        >
          {{ key }}
        </button>
        <button
          class="locker-key locker-key-icon locker-key-wide"
          type="button"
          :disabled="locked"
          :aria-label="t('locker.backspace')"
          @click="erase"
        >
          <DeleteIcon :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>

    <button class="locker-button locker-primary" type="submit" :disabled="!canSubmit">
      {{ inputStatus.loading ? t('common.loading') : t('retrieve.submit') }}
    </button>
  </form>
</template>
