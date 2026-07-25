const formatAmountInWords = (amount: number): string => {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ]

  const naira = Math.floor(amount)
  const kobo = Math.round((amount - naira) * 100)

  const convertToWords = (num: number): string => {
    if (num === 0) return 'Zero'
    if (num < 20) return ones[num]
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    }
    if (num < 1000) {
      return (
        ones[Math.floor(num / 100)] +
        ' Hundred' +
        (num % 100 ? ' ' + convertToWords(num % 100) : '')
      )
    }
    if (num < 1000000) {
      return (
        convertToWords(Math.floor(num / 1000)) +
        ' Thousand' +
        (num % 1000 ? ' ' + convertToWords(num % 1000) : '')
      )
    }
    if (num < 1000000000) {
      return (
        convertToWords(Math.floor(num / 1000000)) +
        ' Million' +
        (num % 1000000 ? ' ' + convertToWords(num % 1000000) : '')
      )
    }
    return (
      convertToWords(Math.floor(num / 1000000000)) +
      ' Billion' +
      (num % 1000000000 ? ' ' + convertToWords(num % 1000000000) : '')
    )
  }

  const nairaWords = convertToWords(naira)
  const koboWords = kobo > 0 ? convertToWords(kobo) : 'Zero'

  return `${nairaWords} Naira ${koboWords} Kobo`
}

const formatDate = (dateString?: string | Date): string => {
  if (!dateString) {
    const now = new Date()
    return now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' . ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' . ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export { formatAmountInWords, formatDate }