import assert from 'node:assert/strict'
import { test } from 'node:test'
import JSZip from 'jszip'
import { loadTypeScript } from './module-loader.mjs'

test('multi-file ZIP keeps all contents, including duplicate filenames', async () => {
  const { packFilesAsZip } = await loadTypeScript('../src/utils/file-processing.ts', {
    jszip: { default: JSZip }
  })
  const archive = await packFilesAsZip([
    new File(['first'], 'report.txt'),
    new File(['second'], 'report.txt'),
    new File(['third'], 'report (2).txt')
  ])
  const zip = await JSZip.loadAsync(await archive.arrayBuffer())
  assert.equal(Object.keys(zip.files).length, 3)
  const contents = await Promise.all(Object.values(zip.files).map((file) => file.async('string')))
  assert.deepEqual(contents.sort(), ['first', 'second', 'third'])
  assert.equal(archive.type, 'application/zip')
})

test('cancelling submission aborts an active text upload', async () => {
  let signal
  const { useSendSubmit } = await loadTypeScript('../src/composables/useSendSubmit.ts', {
    '@/services': {
      FileService: {
        uploadText: (_text, _value, _style, requestSignal) => {
          signal = requestSignal
          return new Promise(() => {})
        }
      },
      uploadChunkedFile() {}
    },
    '@/utils/file-processing': { calculateFileHash() {}, packFilesAsZip() {} },
    './usePresignedUpload': {
      usePresignedUpload: () => ({ uploadFile() {}, reset() {}, cancelUpload: async () => {} })
    }
  })
  const submit = useSendSubmit({
    getMaxFileSize: () => 1024,
    notify() {},
    translate: (key) => key,
    onProgress() {},
    onHashCalculated() {}
  })
  void submit.submitText({ text: 'discard', expireValue: 1, expire_style: 'day' })
  submit.cancelPending()
  assert.equal(signal.aborted, true)
})
