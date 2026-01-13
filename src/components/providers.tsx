'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProgressProvider } from '@bprogress/next/app'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
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
        {children}
      </ProgressProvider>
    </QueryClientProvider>
  )
}
