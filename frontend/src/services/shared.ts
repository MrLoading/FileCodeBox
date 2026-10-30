import type { AxiosRequestConfig } from 'axios'
import type { UploadProgress } from '@/types'

export const multipartUploadConfig = (
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal
): AxiosRequestConfig => ({
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  timeout: 0,
  signal,
  onUploadProgress: (progressEvent) => {
    if (onProgress && progressEvent.total) {
      onProgress({
        loaded: progressEvent.loaded,
        total: progressEvent.total,
        percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
      })
    }
  }
})
