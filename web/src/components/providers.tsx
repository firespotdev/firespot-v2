'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProgressProvider } from '@bprogress/next/app'
import { useState } from 'react'
import { GlobalSocket } from './global-socket'
import { queryRetryDelay, shouldRetryQuery } from '@/lib/utils/query-retry'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
            retryDelay: queryRetryDelay,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ProgressProvider
        height="3px"
        color="#FF6B35"
        options={{ showSpinner: false }}
        shallowRouting
      >
        <GlobalSocket />
        {children}
      </ProgressProvider>
    </QueryClientProvider>
  )
}
