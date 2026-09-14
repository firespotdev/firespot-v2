import { generateReference } from './reference'

describe('payment references', () => {
  it('generates sale IDs with the SL prefix and 12-character suffix', () => {
    const reference = generateReference('SL-', 12)

    expect(reference).toMatch(/^SL-[A-Z0-9]{12}$/)
  })

  it('generates fixed-length alphanumeric references', () => {
    const reference = generateReference('COL-', 12)

    expect(reference).toMatch(/^COL-[A-Z0-9]{12}$/)
  })

  it('keeps the prefix separator while excluding separators from the suffix', () => {
    const reference = generateReference('FS-', 100)
    const suffix = reference.slice('FS-'.length)

    expect(reference.startsWith('FS-')).toBe(true)
    expect(suffix).toMatch(/^[A-Z0-9]{100}$/)
    expect(suffix).not.toMatch(/[-_]/)
  })
})
