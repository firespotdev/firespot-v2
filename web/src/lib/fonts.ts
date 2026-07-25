import localFont from 'next/font/local'

// Satoshi font setup
export const satoshi = localFont({
  src: [
    {
      path: '../../public/fonts/Satoshi-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi-Black.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-satoshi',
})

// Sofia Pro font setup
export const sofiaPro = localFont({
  src: [
    {
      path: '../../public/fonts/sofia-pro-black-az.otf',
      weight: '900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/sofia-pro-medium-az.otf',
      weight: '500',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-sofia-pro',
})
