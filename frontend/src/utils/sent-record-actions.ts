import type { SentFileRecord } from '@/types'
import { copyToClipboard } from '@/utils/clipboard'
import { buildSentRecordQrValue, buildWgetCommand } from '@/utils/share-url'

type CopyNotify = (message: string, type: 'success' | 'error') => void

export function createSentRecordActions(notify: CopyNotify, t: (key: string) => string) {
  const copy = (value: string, successKey: string) =>
    copyToClipboard(value, {
      notify,
      successMsg: t(successKey),
      errorMsg: t('locker.copyFailed')
    })

  return {
    copyLink: (record: SentFileRecord) => copy(buildSentRecordQrValue(record), 'locker.linkCopied'),
    copyCode: (record: SentFileRecord) => copy(record.retrieveCode, 'locker.codeCopied'),
    copyWgetCommand: (command: string) => copy(command, 'locker.commandCopied'),
    getWgetCommand: (record: SentFileRecord) =>
      buildWgetCommand(record.retrieveCode, record.filename),
    getQRCodeValue: buildSentRecordQrValue
  }
}
