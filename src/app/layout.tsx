import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import { CustomDrawer } from '@/components/custom-drawer'
import './globals.css'
import { satoshi, sofiaPro } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Flare - QR Payment for Nigerian Merchants',
  description: 'Accept payments faster with QR codes',
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
          <CustomDrawer />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
