import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import { CustomDrawer } from '@/components/custom-drawer'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import './globals.css'
import { satoshi, sofiaPro } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Firespot Lite - QR Payment Merchants',
  description: 'Accept payments faster with QR codes',
  metadataBase: new URL('https://lite.firespot.co'),
  openGraph: {
    title: 'Firespot Lite - QR Payment Merchants',
    description: 'Accept payments faster with QR codes',
    url: 'https://lite.firespot.co',
    siteName: 'Firespot Lite',
    images: [
      {
        url: '/images/web_thumbnail.webp',
        width: 1200,
        height: 630,
        alt: 'Firespot Lite - QR Payment Merchants',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Firespot Lite - QR Payment Merchants',
    description: 'Accept payments faster with QR codes',
    images: ['/images/web_thumbnail.webp'],
    creator: '@firespot',
  },
  icons: {
    icon: '/favicon.ico',
  },
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
          <ScrollToTop />
          {children}
          <CustomDrawer />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
