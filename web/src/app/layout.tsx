import type { Metadata, Viewport } from 'next'
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
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
