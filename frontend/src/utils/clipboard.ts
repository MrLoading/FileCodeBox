/**
 * 剪贴板工具函数
 */

type CopyNotifyType = 'success' | 'error'

interface CopyOptions {
  successMsg?: string
  errorMsg?: string
  showMsg?: boolean
  notify?: (message: string, type: CopyNotifyType) => void
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @param options 配置选项
 * @returns Promise<boolean> 是否复制成功
 */
export const copyToClipboard = async (
  text: string,
  options: CopyOptions = {}
): Promise<boolean> => {
  const {
    successMsg = '复制成功',
    errorMsg = '复制失败，请手动复制',
    showMsg = true,
    notify
  } = options

  const showCopyMessage = (message: string, type: CopyNotifyType) => {
    if (showMsg) {
      notify?.(message, type)
    }
  }

  try {
    // 优先使用 Clipboard API
    if (document.hasFocus() && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      showCopyMessage(successMsg, 'success')
      return true
    }
    // 后备方案：使用传统的复制方法
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (success) {
      showCopyMessage(successMsg, 'success')
      return true
    } else {
      throw new Error('execCommand copy failed')
    }
  } catch (err) {
    console.error('复制失败:', err)
    showCopyMessage(errorMsg, 'error')
    return false
  }
}
