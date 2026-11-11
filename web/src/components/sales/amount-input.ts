/** Typed keypad amount shown with thousands separators, e.g. "12,500.5". */
export const formatDisplayAmount = (val: string) => {
  if (!val) return '0'
  const [int, dec] = val.split('.')
  const formattedInt = new Intl.NumberFormat('en-NG').format(Number(int))
  return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
}

/** The keypad amount after one key: at most 10 characters and 2 decimals. */
export const nextAmount = (prev: string, key: string) => {
  if (key === 'backspace') return prev.slice(0, -1)
  if (key === '.' && prev.includes('.')) return prev
  if (key === '.' && prev === '') return '0.'
  if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev
  if (prev.length >= 10) return prev
  if (prev === '0' && key !== '.') return key
  return prev + key
}
