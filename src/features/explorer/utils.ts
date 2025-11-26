export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const size = bytes / 1024 ** exponent
  return `${size.toFixed(size >= 10 || size % 1 === 0 ? 0 : 1)} ${units[exponent]}`
}

export const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const extractName = (key: string) => key.split('/').filter(Boolean).pop() ?? key

export const shortenKey = (key: string) =>
  key.length > 28 ? `${key.slice(0, 12)}....${key.slice(-12)}` : key
