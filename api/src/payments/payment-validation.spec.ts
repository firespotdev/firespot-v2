import { validatePaystackPaidValue } from './payment-validation'

describe('validatePaystackPaidValue', () => {
  const expected = {
    reference: 'COL-ABC123',
    amountKobo: 500000,
  }

  const validPayment = {
    status: 'success',
    reference: 'COL-ABC123',
    amount: 500000,
    currency: 'NGN',
  }

  it('accepts only an exact successful NGN payment', () => {
    expect(validatePaystackPaidValue(validPayment, expected)).toEqual({
      valid: true,
    })
  })

  it.each([
    [{ ...validPayment, status: 'pending' }, 'status_mismatch'],
    [{ ...validPayment, reference: 'COL-OTHER' }, 'reference_mismatch'],
    [{ ...validPayment, amount: 499999 }, 'amount_mismatch'],
    [{ ...validPayment, amount: undefined }, 'amount_mismatch'],
    [{ ...validPayment, currency: 'GHS' }, 'currency_mismatch'],
    [{ ...validPayment, currency: undefined }, 'currency_mismatch'],
  ])('fails closed for invalid paid value %#', (payment, reason) => {
    expect(validatePaystackPaidValue(payment, expected)).toEqual({
      valid: false,
      reason,
    })
  })
})
