import { ConfigService } from '@/services'
import { useAlertStore } from '@/stores/alertStore'
import { useConfigStore } from '@/stores/configStore'
import { useI18n } from 'vue-i18n'

export function usePublicConfigBootstrap() {
  const { t } = useI18n()
  const alertStore = useAlertStore()
  const configStore = useConfigStore()

  const syncPublicConfig = async () => {
    try {
      const res = await ConfigService.getUserConfig()

      if (res.code !== 200 || !res.detail) {
        return
      }

      configStore.applyPublicMeta(res.detail.meta)
      const notifyMessage = configStore.applyRemoteConfig(res.detail.config)
      if (notifyMessage) {
        alertStore.showAlert(notifyMessage, 'success')
      }
    } catch {
      alertStore.showAlert(t('locker.configUnavailable'), 'warning')
    }
  }

  return {
    syncPublicConfig
  }
}
