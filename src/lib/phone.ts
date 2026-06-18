const BRAZIL_COUNTRY_CODE = '55'

export function normalizePhone (raw: string): string | null {
  const digits = raw.replace(/\D/g, '')

  if (digits.length < 10 || digits.length > 13) {
    return null
  }

  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12) {
    return digits
  }

  if (digits.length === 10 || digits.length === 11) {
    return `${BRAZIL_COUNTRY_CODE}${digits}`
  }

  return digits
}

export function formatPhoneDisplay (phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 13 && digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    const ddd = digits.slice(2, 4)
    const part1 = digits.slice(4, 9)
    const part2 = digits.slice(9)
    return `+${digits.slice(0, 2)} (${ddd}) ${part1}-${part2}`
  }

  return phone
}

export function phoneToEvolutionNumber (phone: string): string {
  return phone.replace(/\D/g, '')
}
