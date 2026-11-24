'use client'

import { Call, Messages2, Moneys, ReceiveSquare2 } from 'iconsax-reactjs'
import { ActionList, ActionListItem, CircularIconButton, TagFooter } from '../ui'

interface CustomerOptionsDrawerProps {
  closeDrawer: () => void
  onCall: () => void
  onMessage: () => void
  onRecordSale: () => void
  onRecordOutstanding: () => void
}

const ICON = { size: 24, color: '#111827' } as const

/** The ⋯ menu on a customer's page, laid out like a sale's options. */
export function CustomerOptionsDrawer({
  closeDrawer,
  onCall,
  onMessage,
  onRecordSale,
  onRecordOutstanding,
}: CustomerOptionsDrawerProps) {
  const run = (action: () => void) => () => {
    closeDrawer()
    action()
  }

  return (
    <div className="flex h-full flex-col font-satoshi">
      <header className="relative mb-2 flex h-13 w-full items-center justify-between px-4">
        <div className="w-full text-center">
          <h2 className="text-[17px] leading-none font-bold text-black">
            Select an option
          </h2>
        </div>
        <CircularIconButton icon="x" onClick={closeDrawer} />
      </header>

      <div className="flex flex-col gap-4 px-3">
        <ActionList>
          <ActionListItem
            icon={<Call {...ICON} />}
            title="Call"
            onClick={run(onCall)}
          />
          <ActionListItem
            icon={<Messages2 {...ICON} />}
            title="Message"
            onClick={run(onMessage)}
          />
        </ActionList>
        <ActionList>
          <ActionListItem
            icon={<ReceiveSquare2 {...ICON} />}
            title="Record a new sale"
            onClick={run(onRecordSale)}
          />
          <ActionListItem
            icon={<Moneys {...ICON} />}
            title="Record outstanding"
            onClick={run(onRecordOutstanding)}
          />
        </ActionList>
      </div>
      <TagFooter />
    </div>
  )
}
