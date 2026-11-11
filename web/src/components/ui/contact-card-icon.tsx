import Image from 'next/image'

/** Gradient contact card with the Firespot badge, used on "Add new" contact sheets. */
export function ContactCardIcon({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-linear-to-br from-[#FB5012] to-[#D72483] ${className}`}
      aria-hidden
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M17 21H7c-4 0-5-1-5-5V8c0-4 1-5 5-5h10c4 0 5 1 5 5v8c0 4-1 5-5 5ZM14 8h5M15 12h4M17 16h2"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 11.29a1.81 1.81 0 1 0 0-3.62 1.81 1.81 0 0 0 0 3.62ZM12 16.33a3.02 3.02 0 0 0-2.74-2.72 7.72 7.72 0 0 0-1.52 0A3.03 3.03 0 0 0 5 16.33"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute -right-1.5 -bottom-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-xl border-2 border-white">
        <Image
          src="/images/firespot_logo.png"
          alt=""
          width={24}
          height={24}
          className="rounded-[6px] object-cover"
        />
      </div>
    </div>
  )
}
