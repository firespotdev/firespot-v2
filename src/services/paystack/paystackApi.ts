import { useQuery, useMutation } from '@tanstack/react-query'
import { paystackApiClient } from '@/lib/utils/axios'
import type { BankResponse, ValidateAccountNumberResponse } from './interface'

// API functions
export const paystackApi = {
  getBanks: async (country?: string): Promise<BankResponse> => {
    const response = await paystackApiClient.get<BankResponse>('/bank', {
      params: country ? { country } : undefined,
    })
    return response.data
  },

  resolveAccount: async (
    accountNumber: string,
    bankCode: string,
  ): Promise<ValidateAccountNumberResponse> => {
    const response = await paystackApiClient.get<ValidateAccountNumberResponse>(
      '/bank/resolve',
      {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      },
    )
    return response.data
  },
}

// Hooks
export function useBanks() {
  return useQuery({
    queryKey: ['banks', 'nigeria'],
    queryFn: async () => {
      const response = await paystackApi.getBanks('nigeria')
      // Deduplicate banks by code (keep first occurrence)
      const seenCodes = new Set<string>()
      return response.data.filter((bank) => {
        if (seenCodes.has(bank.code)) {
          return false
        }
        seenCodes.add(bank.code)
        return true
      })
    },
    staleTime: 1000 * 60 * 60, // 1 hour - banks don't change often
  })
}

export function useResolveAccount() {
  return useMutation({
    mutationFn: async ({
      accountNumber,
      bankCode,
    }: {
      accountNumber: string
      bankCode: string
    }): Promise<ValidateAccountNumberResponse> => {
      return paystackApi.resolveAccount(accountNumber, bankCode)
    },
    onSuccess: (data) => {
      console.log('Account resolved:', data.data.account_name)
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || 'Failed to resolve account'
      console.error('Account resolution error:', errorMessage)
    },
  })
}
