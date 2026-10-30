import api from './client'
import { multipartUploadConfig } from './shared'
import { uploadToExternalUrl } from './upload-client'
import type {
  ApiResponse,
  PresignConfirmRequest,
  PresignInitRequest,
  PresignInitResponse,
  PresignStatusResponse,
  PresignUploadResult,
  UploadProgress
} from '@/types'

export class PresignUploadService {
  static async initUpload(
    request: PresignInitRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<PresignInitResponse>> {
    return api.post('/presign/upload/init', request, { signal })
  }

  static async proxyUpload(
    uploadId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    uploadUrl?: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<PresignUploadResult>> {
    const formData = new FormData()
    formData.append('file', file)

    return api.put(
      uploadUrl || `/presign/upload/proxy/${uploadId}`,
      formData,
      multipartUploadConfig(onProgress, signal)
    )
  }

  static async confirmUpload(
    uploadId: string,
    request?: PresignConfirmRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<PresignUploadResult>> {
    return api.post(`/presign/upload/confirm/${uploadId}`, request || {}, { signal })
  }

  static async getUploadStatus(uploadId: string): Promise<ApiResponse<PresignStatusResponse>> {
    return api.get(`/presign/upload/status/${uploadId}`)
  }

  static async cancelUpload(uploadId: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete(`/presign/upload/${uploadId}`)
  }

  static async directUploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    signal?: AbortSignal
  ): Promise<boolean> {
    await uploadToExternalUrl(uploadUrl, file, onProgress, signal)
    return true
  }
}
