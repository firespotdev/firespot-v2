'use client'

import { Banknote, CreditCard, Phone, QrCode, SlidersHorizontal, Store, UserRound } from 'lucide-react'
import { ActionList, ActionListItem, BackButton, Button, EmptyState, LoaderCircle } from '@/components/ui'
import { useAuthStore } from '@/services/auth'
import { useUserProfile } from '@/services/users'
import { useCustomerSavedCards } from '@/services/sales/hooks'
import { useDrawerStore } from '@/services/drawer'
import { useSafeBack } from '@/hooks/use-safe-back'

export default function SettingsPage() {
  const profile = useUserProfile()
  const cards = useCustomerSavedCards()
  const mode = useAuthStore((state) => state.activeProfileMode)
  const handleBack = useSafeBack(mode === 'merchant' ? '/profile' : '/home')
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const user = profile.data
  const isMerchant = user?.role === 'merchant'

  return (
    <div className="min-h-dvh bg-[#F4F6F8] font-satoshi">
      <div className="mx-auto min-h-dvh max-w-125 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-[#F4F6F8] px-4 py-4">
          <BackButton onClick={handleBack} iconSize={24} className="-ml-2 size-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring" />
          <h1 className="flex-1 text-center text-base font-bold text-black">Settings</h1>
          <div className="w-9" aria-hidden="true" />
        </header>

        <main className="space-y-6 px-4 pt-2">
          {profile.isLoading ? (
            <div role="status" aria-label="Loading account settings" className="flex justify-center py-16"><LoaderCircle /></div>
          ) : profile.isError || !user ? (
            <div className="py-8">
              <EmptyState emoji="⚙️" title="Settings could not load" details="Please try again to load your account settings." cta={<Button className="mt-4 w-fit px-6" onClick={() => void profile.refetch()}>Retry</Button>} />
            </div>
          ) : (
            <>
              <section aria-labelledby="account-settings-heading">
                <h2 id="account-settings-heading" className="mb-2 text-sm font-medium text-[#545F6C]">Account</h2>
                <ActionList>
                  <ActionListItem as="div" icon={<UserRound size={22} />} title="Name" subtitle={user.fullName || 'Not provided'} trailing={null} className="cursor-default hover:bg-white active:bg-white" />
                  <ActionListItem as="div" icon={<Phone size={22} />} title="Phone number" subtitle={user.fullPhoneNumber || `${user.phoneCountryCode || ''}${user.phoneNumber || ''}`} trailing={null} className="cursor-default hover:bg-white active:bg-white" />
                </ActionList>
              </section>

              <ActionList>
                <ActionListItem
                  icon={<CreditCard size={22} />}
                  title="Saved cards"
                  subtitle={cards.isLoading ? 'Loading saved cards…' : cards.isError ? 'Could not load saved cards. Tap to retry.' : undefined}
                  disabled={cards.isLoading}
                  onClick={() => {
                    if (cards.isError) {
                      void cards.refetch()
                      return
                    }
                    openDrawer({ type: 'saved-cards', props: { savedCards: cards.data || [], readOnly: true } })
                  }}
                />
              </ActionList>

              {isMerchant && (
                <>
                  <section aria-labelledby="business-settings-heading">
                    <h2 id="business-settings-heading" className="mb-2 text-sm font-medium text-[#545F6C]">Business</h2>
                    <ActionList>
                      <ActionListItem icon={<Store size={22} />} title="Shop setup" subtitle={user.businessName} href="/shop-setup" />
                      <ActionListItem icon={<Banknote size={22} />} title="Bank accounts" onClick={() => openDrawer({ type: 'bank-accounts', props: { bankAccounts: user.bankAccounts || [] } })} />
                      <ActionListItem icon={<SlidersHorizontal size={22} />} title="Payment settings" onClick={() => openDrawer({ type: 'payment-methods-active' })} />
                      <ActionListItem icon={<CreditCard size={22} />} title="Plans" href="/plans" />
                      <ActionListItem icon={<QrCode size={22} />} title="QR kits" href="/qr-kits" />
                    </ActionList>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
