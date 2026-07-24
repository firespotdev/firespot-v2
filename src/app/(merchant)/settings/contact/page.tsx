'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from '@bprogress/next/app'
import {
  ArrowLeft,
  MessageCircle,
  Music2,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import { useUserProfile } from '@/services/users'
import { useUpdateContact } from '@/services/shop'
import type { ShopSocialLinks } from '@/services/auth/interface'

// Only ig/fb/twitter svgs ship today; the other two use a lucide fallback in a
// brand-coloured tile until real assets land.
const SOCIALS: Array<{
  key: keyof ShopSocialLinks
  label: string
  icon?: string
  altIcon?: string
  altIconBg?: string
}> = [
  { key: 'instagram', label: 'Instagram profile link', icon: '/icons/ig.svg' },
  {
    key: 'facebook',
    label: 'Facebook profile link',
    altIcon: '/icons/fb.png',
    altIconBg: '#1877F2',
  },
  {
    key: 'whatsapp',
    label: 'Whatsapp profile link',
    icon: '/icons/whatsapp.png',
  },
  {
    key: 'tiktok',
    label: 'Tiktok profile link',
    icon: '/icons/tiktok.png',
  },
  {
    key: 'x',
    label: 'X profile link',
    altIcon: '/icons/twitter.png',
    altIconBg: 'black',
  },
]

export default function ContactSettingsPage() {
  const router = useRouter()
  const { data: profile } = useUserProfile()
  const update = useUpdateContact()

  const [businessEmail, setBusinessEmail] = useState(
    profile?.businessEmail ?? '',
  )
  const [website, setWebsite] = useState(profile?.website ?? '')
  const [socials, setSocials] = useState<ShopSocialLinks>(
    profile?.socialLinks ?? {},
  )

  const setSocial = (key: keyof ShopSocialLinks, value: string) =>
    setSocials((prev) => ({ ...prev, [key]: value }))

  const handleContinue = () => {
    update.mutate(
      {
        businessEmail: businessEmail.trim() || undefined,
        website: website.trim() || undefined,
        socialLinks: socials,
      },
      {
        onSuccess: () => router.back(),
        onError: () =>
          showNotificationToast({ message: 'Could not save. Try again.' }),
      },
    )
  }

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="max-w-125 mx-auto min-h-dvh flex flex-col">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="self-start px-4 py-3.5 flex items-center justify-center"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>

        {/* flex-1 pushes the footer to the bottom; it scrolls if content is tall */}
        <div className="px-4 flex-1">
          <p className="text-sm text-[#00000080] font-medium mt-0.5">
            Set up profile
          </p>
          <h1 className="text-[20px] -tracking-[0.4px] font-bold text-black mt-1">
            Contact details
          </h1>

          <div className="space-y-6 mt-6 flex-1">
            <div>
              <Label>Business email address</Label>
              <Input
                type="email"
                inputMode="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="Enter your email address"
                className="font-medium"
              />
            </div>

            <div>
              <Label>Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Enter your business’ website"
                className="font-medium"
              />
            </div>

            <div className="space-y-3">
              <Label className="p-0">Social links</Label>
              {SOCIALS.map(({ key, label, icon, altIcon, altIconBg }) => (
                <div key={key} className="flex items-center gap-2">
                  {icon ? (
                    <span className="w-9 h-9 rounded-[10px] overflow-hidden shrink-0 flex items-center justify-center">
                      <Image src={icon} alt={label} width={36} height={36} />
                    </span>
                  ) : (
                    <span
                      className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center"
                      style={{ background: altIconBg }}
                    >
                      {altIcon && (
                        <Image
                          src={altIcon}
                          alt={label}
                          width={20}
                          height={20}
                        />
                      )}
                    </span>
                  )}
                  <Input
                    value={socials[key] ?? ''}
                    onChange={(e) => setSocial(key, e.target.value)}
                    placeholder={label}
                    className="flex-1 h-9 font-medium"
                  />
                  <div className="bg-[#F1F1F1] w-9 h-9 rounded-[10px] flex justify-center items-center">
                    <X size={16} color="black" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#F1F1F1] rounded-t-[12px] p-4 w-full">
          <Button
            onClick={handleContinue}
            disabled={update.isPending}
            className="w-full h-14 font-bold"
          >
            {update.isPending ? <Spinner /> : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
