'use client'

import { useCallback } from 'react'

interface ContactPickerNavigator extends Navigator {
  contacts?: {
    select: (
      properties: Array<'name' | 'tel'>,
      options?: { multiple?: boolean },
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>
  }
}

export interface PickedContact {
  name: string
  phoneNumber: string
}

export type ContactPickerResult =
  | { status: 'selected'; contacts: PickedContact[] }
  | { status: 'cancelled'; contacts: [] }
  | { status: 'unsupported'; contacts: [] }
  | { status: 'error'; contacts: []; error: Error }

export function normalizeNigerianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '')
  const local =
    digits.length === 13 && digits.startsWith('234')
      ? digits.slice(3)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits

  return local.length === 10 ? `+234${local}` : null
}

export function useContactPicker() {
  const isSupported =
    typeof navigator !== 'undefined' &&
    Boolean((navigator as ContactPickerNavigator).contacts?.select)

  const selectContacts = useCallback(
    async ({ multiple = false }: { multiple?: boolean } = {}): Promise<ContactPickerResult> => {
      const contactNavigator = navigator as ContactPickerNavigator

      if (!contactNavigator.contacts?.select) {
        return { status: 'unsupported', contacts: [] }
      }

      try {
        const selected = await contactNavigator.contacts.select(
          ['name', 'tel'],
          { multiple },
        )
        const contacts = selected.flatMap((contact) => {
          const phoneNumber = normalizeNigerianPhoneNumber(
            contact.tel?.[0] || '',
          )
          if (!phoneNumber) return []

          return [
            {
              name: contact.name?.[0]?.trim() || phoneNumber,
              phoneNumber,
            },
          ]
        })

        return contacts.length
          ? { status: 'selected', contacts }
          : { status: 'cancelled', contacts: [] }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return { status: 'cancelled', contacts: [] }
        }
        return {
          status: 'error',
          contacts: [],
          error: error as Error,
        }
      }
    },
    [],
  )

  return { isSupported, selectContacts }
}
