'use client'

import { forwardRef } from 'react'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

interface QRKitCardProps {
  brandedSvg: string
}

/**
 * Reusable QR Kit Card component for PDF generation.
 */
const QRKitCard = forwardRef<HTMLDivElement, QRKitCardProps>(function QRKitCard(
  { brandedSvg },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        background:
          'radial-gradient(circle at top center, rgba(255, 94, 0) -25%, rgba(0, 0, 0) 40%)',
        backdropFilter: 'blur(125.30880737304688px)',
      }}
      className="py-6 px-6 rounded-[12px] flex flex-col items-center relative w-[300px]"
    >
      <h2 className="text-white text-center font-bold text-xl leading-none tracking-tight">
        SCAN TO TRANSFER
        <br />
        <span className="bg-linear-to-r from-[#FB5012] to-[#D72483] text-transparent bg-clip-text">
          IN UNDER A MINUTE
        </span>
      </h2>

      <p className="text-[#FFFFFF99] text-center text-[8.7px] font-medium mb-3.5">
        Scan with your camera, send from any bank
      </p>

      <div className="rounded-xl relative mb-4">
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0.32%" stopColor="#FB5012" />
              <stop offset="100.3%" stopColor="#D72483" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="rounded-[12px] p-1"
          style={{
            background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
          }}
        >
          <div className="bg-white p-2 rounded-[1.2rem] relative">
            <div
              dangerouslySetInnerHTML={{ __html: brandedSvg }}
              className="h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 w-full gap-1 px-10">
        <div className="bg-[#FFFFFF33] rounded-full px-1 flex justify-between items-center gap-1 w-1/2">
          <p className="text-white text-[6px] pl-0.5">scan with</p>
          <div className="flex items-center gap-0.5 justify-center">
            <div className="camera w-[8.7px] h-[8.7px] rounded-full bg-white flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-camera-icon lucide-camera"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>

            <div className="snapchat w-[8.7px] h-[8.7px] flex rounded-full bg-[#FFFC00] items-center justify-center">
              <svg
                fill="#000000"
                height="5.5px"
                width="5.5px"
                viewBox="0 0 512.853 512.853"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M500.907,376.747c-64.853-11.093-93.867-75.947-97.28-83.627v-0.853c-3.413-6.827-4.267-11.947-2.56-16.213 c3.413-7.68,17.92-12.8,27.307-15.36c2.56-0.853,5.12-1.707,6.827-2.56c17.92-7.68,27.307-17.067,27.307-28.16 c0-8.533-6.827-17.067-17.067-20.48c-3.413-1.707-7.68-2.56-11.947-2.56c-2.56,0-6.827,0.853-11.093,2.56 c-8.533,3.413-15.36,5.973-20.48,5.973c-1.707,0-3.413,0-5.12-0.853c0.853-2.56,0.853-5.12,0.853-8.533v-1.707 c1.707-34.987,5.12-78.507-6.827-104.107c-34.987-76.8-107.52-82.773-128.853-82.773h-10.24c-21.333,0-93.867,5.973-128,82.773 c-11.947,25.6-9.387,69.12-6.827,104.107c0.853,3.413,0.853,6.827,0.853,10.24c-1.707,0-4.267,0.853-6.827,0.853 c-6.827,0-13.653-1.707-22.187-5.973c-11.947-5.12-34.987,2.56-37.547,17.92c-1.707,8.533,1.707,20.48,27.307,30.72 c1.707,0.853,4.267,1.707,7.68,2.56c8.533,2.56,23.04,7.68,26.453,15.36c1.707,3.413,0.853,9.387-2.56,16.213 c-1.707,2.56-31.573,71.68-98.987,82.773C4.267,376.747,0,382.72,0,389.547c0,2.56,0.853,4.267,1.707,5.973 c5.12,13.653,27.307,22.187,67.413,29.013c0.853,2.56,1.707,7.68,2.56,10.24c0.853,3.413,1.707,7.68,2.56,11.947 c0.853,4.267,5.12,11.093,15.36,11.093c3.413,0,7.68-0.853,11.947-1.707c6.827-1.707,15.36-3.413,26.453-3.413 c6.827,0,12.8,0.853,19.627,2.56c11.947,1.707,23.04,9.387,34.987,17.92c17.92,12.8,34.133,22.187,67.413,22.187 c0.853,0,1.707,0,2.56,0s2.56,0,3.413,0c29.013,0,54.613-7.68,76.8-22.187c11.947-7.68,23.04-16.213,34.987-17.92 c5.973-0.853,12.8-1.707,18.773-1.707c10.24,0,18.773,0.853,26.453,2.56c5.12,0.853,9.387,1.707,12.8,1.707 c6.827,0,12.8-4.267,14.507-11.093c0.853-4.267,1.707-7.68,2.56-11.947c0.853-1.707,1.707-6.827,2.56-9.387 c40.107-5.973,59.733-15.36,65.707-28.16c0.853-1.707,1.707-4.267,1.707-5.973C512.853,384.427,507.733,377.6,500.907,376.747z" />
              </svg>
            </div>

            <div className="google w-[8.7px] h-[8.7px] rounded-full bg-white flex items-center justify-center">
              <svg
                width="5.5px"
                height="5.5px"
                viewBox="-3 0 262 262"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid"
              >
                <path
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  fill="#4285F4"
                />
                <path
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  fill="#34A853"
                />
                <path
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                  fill="#FBBC05"
                />
                <path
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  fill="#EB4335"
                />
              </svg>
            </div>
            <div className="chrome w-[8.7px] h-[8.7px] rounded-full bg-white flex items-center justify-center">
              <svg
                width="8.7px"
                height="8.7px"
                viewBox="-0.5 0 257 257"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMinYMin meet"
              >
                <defs>
                  <linearGradient
                    x1="49.998%"
                    y1=".706%"
                    x2="49.998%"
                    y2="96.99%"
                    id="chromeGrad"
                  >
                    <stop stopColor="#86BBE5" offset="0%" />
                    <stop stopColor="#1072BA" offset="100%" />
                  </linearGradient>
                </defs>
                <path
                  d="M127.789.035s75.32-3.38 115.253 72.328H121.38s-22.96-.74-42.573 27.114c-5.634 11.691-11.69 23.734-4.894 47.468-9.79-16.586-51.975-90.04-51.975-90.04S51.693 3.028 127.788.035z"
                  fill="#EF3F36"
                />
                <path
                  d="M239.133 192.229s-34.756 66.94-120.253 63.63c10.564-18.276 60.848-105.358 60.848-105.358s12.149-19.508-2.183-50.425c-7.29-10.74-14.72-21.973-38.664-27.96 19.262-.175 103.95 0 103.95 0s31.726 52.715-3.698 120.113z"
                  fill="#FCD900"
                />
                <path
                  d="M16.973 192.757s-40.601-63.56 5.035-135.958c10.529 18.276 60.813 105.358 60.813 105.358s10.846 20.283 44.756 23.31c12.924-.95 26.375-1.76 43.56-19.472C161.663 182.757 119.16 256 119.16 256s-61.552 1.127-102.188-63.243z"
                  fill="#61BC5B"
                />
                <path
                  d="M118.845 256.493l17.113-71.412s18.804-1.48 34.58-18.769c-9.79 17.22-51.693 90.181-51.693 90.181z"
                  fill="#5AB055"
                />
                <path
                  d="M70.462 129.056c0-31.48 25.53-57.01 57.01-57.01 31.48 0 57.01 25.53 57.01 57.01 0 31.481-25.53 57.01-57.01 57.01-31.48-.035-57.01-25.529-57.01-57.01z"
                  fill="#FFF"
                />
                <path
                  d="M80.004 129.056c0-26.198 21.234-47.467 47.468-47.467 26.198 0 47.467 21.234 47.467 47.467 0 26.199-21.233 47.468-47.467 47.468-26.199 0-47.468-21.269-47.468-47.468z"
                  fill="url(#chromeGrad)"
                />
                <path
                  d="M242.795 72.152l-70.462 20.67s-10.634-15.6-33.487-20.67c19.825-.106 103.949 0 103.949 0z"
                  fill="#EACA05"
                />
                <path
                  d="M72.54 144.339c-9.896-17.149-50.602-87.434-50.602-87.434l52.186 51.622s-5.353 11.022-3.345 26.797l1.76 9.015z"
                  fill="#DF3A32"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-[#FFFFFF33] rounded-full px-1 flex justify-between items-center gap-0.5 w-1/2">
          <p className="text-white text-[6px]">
            <span className="text-[#FFFFFF80]">or go to </span>
            pay.firespot.co
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/world.png" alt="world" width={8.8} height={8.8} />
        </div>
      </div>

      <div className="flex justify-between w-full items-center mt-6 px-2">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/firespot_logo.svg"
            alt="Firespot"
            width={12}
            height={12}
          />
          <span className="text-white text-[8px] font-medium ml-1">
            firespot
          </span>
        </div>
        <div className="flex gap-1">
          <span className="font-medium text-[#FFFFFF80] tracking-tight text-[5.81px]">
            Powered by Firespot
          </span>
        </div>
      </div>
    </div>
  )
})

export default QRKitCard
