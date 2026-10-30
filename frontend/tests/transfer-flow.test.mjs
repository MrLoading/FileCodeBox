import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as vue from 'vue'
import * as pinia from 'pinia'
import { loadTypeScript } from './module-loader.mjs'

let storeId = 0
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
async function createFlow(kind, extra = {}) {
  const alerts = []
  const records = pinia.defineStore(`flow-${storeId++}`, () => {
    const shareData = vue.ref([])
    const receiveData = vue.ref([])
    return {
      shareData,
      receiveData,
      addShareDataRecord: (record) => shareData.value.push(record),
      addReceiveData: (record) => receiveData.value.push(record),
      deleteShareData: (index) => shareData.value.splice(index, 1),
      deleteReceiveData: (index) => receiveData.value.splice(index, 1)
    }
  })(pinia.createPinia())
  const config = vue.reactive({
    expire_style: ['day', 'forever'],
    upload_size: 1024,
    open_upload: 1,
    allowed_file_types: ['*'],
    max_save_seconds: 0
  })
  const source = kind === 'send' ? 'useSendFlow' : 'useRetrieveFlow'
  let cancelled = 0
  const dependencies = {
    vue,
    pinia,
    'vue-i18n': { useI18n: () => ({ t: (key) => key }) },
    '@/stores/alertStore': { useAlertStore: () => ({ showAlert: (...args) => alerts.push(args) }) },
    '@/stores/adminStore': { useAdminStore: () => ({ hasToken: false }) },
    '@/stores/configStore': { useConfigStore: () => ({ config, uploadSizeLimit: 1024 }) },
    '@/stores/fileData': { useFileDataStore: () => records },
    '@/utils/common': {
      getErrorMessage: (error) => error.message,
      getResponseMessage: (response) => response.message || 'Failed'
    },
    '@/utils/convert': { getStorageUnit: (value) => `${value} B` },
    '@/utils/send-record': {
      isExpirationWithinLimit: () => true,
      buildSentRecord: (input) => ({ retrieveCode: input.response.detail.code })
    },
    '@/utils/sent-record-actions': {
      createSentRecordActions: () => ({
        copyCode() {},
        copyLink() {},
        copyWgetCommand() {},
        getQRCodeValue() {}
      })
    },
    './useSendSubmit': {
      useSendSubmit: () => ({
        resetPresignUpload() {},
        cancelPending() {
          cancelled++
        },
        submitFile: async () => null,
        submitText: async () => null,
        ...extra.submit
      })
    },
    '@/services': { FileService: extra.service || {} },
    '@/utils/clipboard': { copyToClipboard: async () => {} },
    '@/utils/content-preview': { renderMarkdownPreview: extra.render || (async (text) => text) },
    '@/utils/download-action': { downloadReceivedRecord: async () => {} }
  }
  const module = await loadTypeScript(`../src/composables/${source}.ts`, dependencies)
  const scope = vue.effectScope()
  const flow = scope.run(() => module[source]())
  return { flow, scope, records, config, alerts, cancelled: () => cancelled }
}

test('text and multiple files are mutually exclusive; removing the last file restores the empty layout', async () => {
  const { flow, scope } = await createFlow('send')
  const a = new File(['a'], 'a.txt', { lastModified: 1 })
  const b = new File(['b'], 'b.txt', { lastModified: 2 })
  assert.equal(flow.payloadMode.value, 'empty')
  flow.addFiles([a, b])
  flow.addFiles([a])
  assert.equal(flow.files.value.length, 2)
  assert.equal(flow.payloadMode.value, 'file')
  flow.removeFile(0)
  assert.equal(flow.selectedFile.value.name, 'b.txt')
  flow.removeFile(0)
  assert.equal(flow.payloadMode.value, 'empty')
  flow.textContent.value = 'text'
  assert.equal(flow.payloadMode.value, 'text')
  flow.addFiles([a])
  assert.equal(flow.textContent.value, '')
  assert.equal(flow.payloadMode.value, 'file')
  flow.textContent.value = 'new text'
  assert.equal(flow.files.value.length, 0)
  flow.textContent.value = '   '
  assert.equal(flow.payloadMode.value, 'empty')
  scope.stop()
})

test('invalid file batches preserve the existing valid selection', async () => {
  const { flow, scope, config } = await createFlow('send')
  const a = new File(['a'], 'a.txt')
  flow.addFiles([a])
  config.allowed_file_types = ['txt']
  flow.addFiles([new File(['bad'], 'bad.exe')])
  assert.equal(flow.files.value.length, 1)
  assert.equal(flow.files.value[0].name, 'a.txt')
  flow.addFiles([new File(['x'.repeat(1025)], 'big.txt')])
  assert.equal(flow.files.value[0].name, 'a.txt')
  scope.stop()
})

test('leaving a send page clears drafts and ignores a late upload response without deleting completed history', async () => {
  const pending = deferred()
  const { flow, scope, records, cancelled, alerts } = await createFlow('send', {
    submit: { submitText: () => pending.promise }
  })
  records.addShareDataRecord({ retrieveCode: 'older' })
  flow.textContent.value = 'discard me'
  const submission = flow.handleSubmit()
  assert.equal(flow.isSubmitting.value, true)
  flow.resetDraft()
  assert.equal(cancelled(), 1)
  assert.equal(flow.textContent.value, '')
  assert.equal(flow.payloadMode.value, 'empty')
  pending.resolve({ code: 200, detail: { code: '12345' } })
  await submission
  assert.equal(flow.selectedRecord.value, null)
  assert.equal(records.shareData.length, 1)
  assert.equal(alerts.length, 0)
  scope.stop()
})

test('leaving retrieval aborts the request and ignores its late result', async () => {
  const pending = deferred()
  let signal
  const { flow, scope, records, alerts } = await createFlow('retrieve', {
    service: {
      selectFile: (_code, requestSignal) => {
        signal = requestSignal
        return pending.promise
      }
    }
  })
  flow.code.value = '12345'
  const submission = flow.handleSubmit()
  flow.resetDraft()
  assert.equal(signal.aborted, true)
  pending.resolve({
    code: 200,
    detail: { code: '12345', name: 'a.txt', size: 1, text: '/share/download', is_text: false }
  })
  await submission
  assert.equal(flow.code.value, '')
  assert.equal(flow.inputStatus.value.loading, false)
  assert.equal(flow.selectedRecord.value, null)
  assert.equal(records.receiveData.length, 0)
  assert.equal(alerts.length, 0)
  scope.stop()
})

test('retrieval errors keep the code for retry; repeated submit does not duplicate a pending request', async () => {
  const pending = deferred()
  let calls = 0
  const { flow, scope } = await createFlow('retrieve', {
    service: {
      selectFile: () => {
        calls++
        return pending.promise
      }
    }
  })
  flow.code.value = '12345'
  const first = flow.handleSubmit()
  await flow.handleSubmit()
  assert.equal(calls, 1)
  pending.reject(new Error('Network unavailable'))
  await first
  assert.equal(flow.code.value, '12345')
  assert.match(flow.error.value, /Network unavailable/)
  assert.equal(flow.inputStatus.value.loading, false)
  scope.stop()
})

test('a late Markdown renderer cannot restore a preview after leaving', async () => {
  const pending = deferred()
  const { flow, scope } = await createFlow('retrieve', { render: () => pending.promise })
  flow.viewDetails({ id: 1, content: 'old text' })
  await vue.nextTick()
  flow.resetDraft()
  await vue.nextTick()
  pending.resolve('<p>old text</p>')
  await vue.nextTick()
  assert.equal(flow.renderedContent.value, '')
  scope.stop()
})
