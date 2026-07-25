import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import './globals.css'
import { satoshi, sofiaPro } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Firespot Admin - Dashboard',
  description: 'Firespot Admin Dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${satoshi.variable} ${sofiaPro.variable} antialiased leading-[100%]`}
      >
        <Providers>
          {children}
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
