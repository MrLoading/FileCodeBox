<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue: string
    inputStatus: { readonly: boolean; loading: boolean }
    error?: boolean
    length?: number
  }>(),
  { length: 5 }
)
const emit = defineEmits<{ submit: []; 'update:modelValue': [value: string] }>()
const { t } = useI18n()
const slots = ref<string[]>(Array(props.length).fill(''))
const inputs = ref<HTMLInputElement[]>([])
const active = ref(0)
const nativeKeyboard = ref(false)
const locked = computed(() => props.inputStatus.readonly || props.inputStatus.loading)
const complete = computed(() => slots.value.every(Boolean))
const update = () => emit('update:modelValue', slots.value.join(''))
const focus = async (index: number) => {
  await nextTick()
  inputs.value[Math.max(0, Math.min(index, props.length - 1))]?.focus({ preventScroll: true })
}
const fill = (value: string, start = active.value, focusNext = false) => {
  if (locked.value) return
  const chars = value
    .normalize('NFKC')
    .replace(/\s/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, props.length)
  if (!chars) return
  const offset = chars.length === props.length ? 0 : start
  chars
    .slice(0, props.length - offset)
    .split('')
    .forEach((char, i) => {
      slots.value[offset + i] = char
    })
  active.value = Math.min(offset + chars.length, props.length)
  update()
  if (focusNext && active.value < props.length) void focus(active.value)
}
const clear = () => {
  if (!locked.value) {
    slots.value.fill('')
    active.value = 0
    update()
  }
}
const toggleKeyboard = async () => {
  nativeKeyboard.value = !nativeKeyboard.value
  if (nativeKeyboard.value) await focus(Math.min(active.value, props.length - 1))
  else inputs.value.forEach((input) => input.blur())
}
const erase = (focusNext = false) => {
  if (locked.value) return
  let index = Math.min(active.value, props.length - 1)
  if (!slots.value[index] && index > 0) index--
  slots.value[index] = ''
  active.value = index
  update()
  if (focusNext) void focus(index)
}
const onInput = (event: Event, index: number) => {
  const input = event.target as HTMLInputElement
  const inputEvent = event as InputEvent
  if (inputEvent.isComposing || locked.value) return
  if (!input.value) {
    slots.value[index] = ''
    active.value = index
    update()
  } else fill(inputEvent.data ?? input.value, index, true)
}
const paste = (event: ClipboardEvent, index = active.value) => {
  event.preventDefault()
  event.stopPropagation()
  fill(event.clipboardData?.getData('text') || '', Math.min(index, props.length - 1), true)
}
const key = (event: KeyboardEvent, index?: number) => {
  if (locked.value || event.ctrlKey || event.metaKey || event.altKey) return
  if (index !== undefined) active.value = index
  if (event.key === 'Backspace') {
    event.preventDefault()
    erase(index !== undefined)
  } else if (event.key === 'Delete' && index !== undefined) {
    event.preventDefault()
    slots.value[index] = ''
    update()
  } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && index !== undefined) {
    event.preventDefault()
    void focus(index + (event.key === 'ArrowLeft' ? -1 : 1))
  } else if (
    index === undefined &&
    /^[A-Za-z0-9]$/.test(event.key) &&
    active.value < props.length
  ) {
    event.preventDefault()
    fill(event.key)
  }
}
watch(
  () => props.modelValue,
  (value) => {
    if (value !== slots.value.join('')) {
      slots.value = Array.from({ length: props.length }, (_, i) => value[i] || '')
      active.value = Math.min(value.length, props.length)
    }
  },
  { immediate: true }
)
</script>

<template>
  <form
    @submit.prevent="!locked && complete && emit('submit')"
    @paste="paste($event)"
    @keydown="($event.target as HTMLElement).tagName !== 'INPUT' && key($event)"
  >
    <div class="locker-code-heading">
      <span class="locker-label">{{ t('locker.codeLabel', { count: length }) }}</span>
      <button
        class="locker-button"
        type="button"
        :disabled="locked"
        :aria-label="t('locker.keyboardInput')"
        :aria-pressed="nativeKeyboard"
        @click="toggleKeyboard"
      >
        {{ nativeKeyboard ? '123' : 'ABC' }}
      </button>
    </div>
    <div
      class="locker-code-slots"
      :style="{ '--code-length': length }"
      role="group"
      :aria-label="t('retrieve.codeInput.label')"
    >
      <input
        v-for="(_, index) in slots"
        :key="index"
        :ref="
          (el) => {
            if (el) inputs[index] = el as HTMLInputElement
          }
        "
        class="locker-code-slot"
        :class="{ 'is-active': active === index, 'has-error': error }"
        :value="slots[index]"
        type="text"
        :inputmode="nativeKeyboard ? 'text' : 'none'"
        :maxlength="length"
        :readonly="locked"
        :autocomplete="index === 0 ? 'one-time-code' : 'off'"
        autocapitalize="off"
        :spellcheck="false"
        :aria-label="`${t('retrieve.codeInput.label')} ${index + 1}`"
        @focus="active = index"
        @click="active = index"
        @input="onInput($event, index)"
        @keydown.stop="key($event, index)"
        @paste="paste($event, index)"
      />
    </div>
    <div class="locker-keypad" :aria-label="t('retrieve.codeInput.label')">
      <button
        v-for="digit in 9"
        :key="digit"
        class="locker-key"
        type="button"
        :disabled="locked"
        @click="active < length && fill(String(digit))"
      >
        {{ digit }}
      </button>
      <button
        class="locker-key locker-key-secondary"
        type="button"
        :disabled="locked"
        @click="clear"
      >
        {{ t('locker.clear') }}
      </button>
      <button
        class="locker-key"
        type="button"
        :disabled="locked"
        @click="active < length && fill('0')"
      >
        0
      </button>
      <button
        class="locker-key locker-key-secondary"
        type="button"
        :disabled="locked"
        @click="erase(false)"
      >
        {{ t('locker.backspace') }}
      </button>
    </div>
    <button class="locker-button locker-primary" type="submit" :disabled="locked || !complete">
      {{ inputStatus.loading ? t('common.loading') : t('retrieve.submit') }}
    </button>
  </form>
</template>
