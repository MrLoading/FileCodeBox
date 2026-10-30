// 存储单位转换
export const getStorageUnit = (value: number) => {
  if (value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  return `${Number((value / 1024 ** index).toFixed(1))} ${units[index]}`
}
