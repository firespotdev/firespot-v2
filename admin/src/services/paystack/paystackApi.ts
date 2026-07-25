import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/utils/axios'

interface ResolveAccountResponse {
  accountName: string
  accountNumber: string
}

interface BackendBanksResponse {
  banks: Array<{
    name: string
    code: string
    slug: string
  }>
}

export const paystackApi = {
  getBanks: async (): Promise<BackendBanksResponse> => {
    const response = await apiClient.get<BackendBanksResponse>('/users/banks')
    return response.data
  },

  resolveAccount: async (
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolveAccountResponse> => {
    const response = await apiClient.post<ResolveAccountResponse>(
      '/users/bank-accounts/resolve',
      {
        accountNumber,
        bankCode,
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
      const response = await paystackApi.getBanks()
      const seenCodes = new Set<string>()
      return response.banks.filter((bank) => {
        if (seenCodes.has(bank.code)) {
          return false
        }
        seenCodes.add(bank.code)
        return true
      })
    },
    staleTime: 1000 * 60 * 60, // 1 hour
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
    }): Promise<ResolveAccountResponse> => {
      return paystackApi.resolveAccount(accountNumber, bankCode)
    },
    onSuccess: (data) => {
      console.log('Account resolved:', data.accountName)
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || 'Failed to resolve account'
      if (errorMessage.includes('limit')) {
        console.warn('Paystack Resolution Limit:', errorMessage)
      } else {
        console.error('Account resolution error:', errorMessage)
      }
    },
  })
}
