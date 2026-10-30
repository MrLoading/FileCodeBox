import { FileService, uploadChunkedFile } from '@/services'
import type { AlertType, ApiResponse, ExpireStyle, UploadProgress } from '@/types'
import { calculateFileHash, packFilesAsZip } from '@/utils/file-processing'
import { usePresignedUpload } from './usePresignedUpload'

type Translate = (key: string, params?: Record<string, string | number | undefined>) => string

type UseSendSubmitOptions = {
  getMaxFileSize: () => number
  notify: (message: string, type: AlertType) => void
  translate: Translate
  onProgress: (progress: UploadProgress) => void
  onHashCalculated: (hash: string) => void
}

type SubmitFileOptions = {
  selectedFile: File | null
  selectedFiles: File[]
  expireValue: number
  expire_style: string
  enable_chunk: boolean
  validateFileSize: (file: File) => boolean
}

type SubmitTextOptions = {
  text: string
  expireValue: number
  expire_style: string
}

export function useSendSubmit(options: UseSendSubmitOptions) {
  let pending: AbortController | null = null
  const {
    uploadFile: presignUploadFile,
    reset: resetPresignUpload,
    cancelUpload,
    errorMessage
  } = usePresignedUpload({
    getMaxFileSize: options.getMaxFileSize,
    // The workflow emits one result notification, including the retrieval code.
    notify: () => {}
  })

  const handleChunkUpload = async (
    file: File,
    expireValue: number,
    expire_style: string,
    signal: AbortSignal
  ): Promise<ApiResponse> => {
    return uploadChunkedFile(file, {
      signal,
      expireValue,
      expire_style,
      onHashCalculated: options.onHashCalculated,
      onProgress: (progress: UploadProgress) => {
        options.onProgress(progress)
      },
      messages: {
        initFailed: options.translate('send.messages.initChunkUploadFailed'),
        chunkFailed: (index) => options.translate('send.messages.chunkUploadFailed', { index }),
        completeFailed: options.translate('send.messages.completeUploadFailed')
      }
    })
  }

  const handlePresignedUpload = async (
    file: File,
    expireValue: number,
    expire_style: string,
    signal: AbortSignal
  ): Promise<ApiResponse<{ code?: string; name?: string }>> => {
    const code = await presignUploadFile(file, {
      signal,
      expireValue,
      expire_style: expire_style as ExpireStyle,
      onProgress: (progress) => {
        options.onProgress(progress)
      }
    })

    if (!code) {
      throw new Error(errorMessage?.value || options.translate('send.messages.uploadFailed'))
    }

    return {
      code: 200,
      detail: {
        code,
        name: file.name
      }
    }
  }

  const submitFile = async ({
    selectedFile,
    selectedFiles,
    expireValue,
    expire_style,
    enable_chunk,
    validateFileSize
  }: SubmitFileOptions): Promise<ApiResponse | null> => {
    pending = new AbortController()
    const signal = pending.signal
    let fileToUpload = selectedFile

    if (selectedFiles.length > 0) {
      fileToUpload = await packFilesAsZip(selectedFiles)
      signal.throwIfAborted()
      if (!validateFileSize(fileToUpload)) {
        return null
      }
      options.onHashCalculated(await calculateFileHash(fileToUpload))
    }

    if (!fileToUpload) {
      throw new Error(options.translate('send.messages.selectFile'))
    }

    return enable_chunk
      ? handleChunkUpload(fileToUpload, expireValue, expire_style, signal)
      : handlePresignedUpload(fileToUpload, expireValue, expire_style, signal)
  }

  const submitText = ({ text, expireValue, expire_style }: SubmitTextOptions) => {
    pending = new AbortController()
    return FileService.uploadText(text, expireValue, expire_style, pending.signal)
  }

  return {
    cancelPending: () => {
      pending?.abort()
      pending = null
      void cancelUpload(true)
    },
    resetPresignUpload,
    submitFile,
    submitText
  }
}
