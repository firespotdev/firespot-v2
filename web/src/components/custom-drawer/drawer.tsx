'use client'

import { Check, X } from 'lucide-react'
import {
  Drawer as DrawerPrimitive,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  useDrawerStore,
  type DrawerContentType,
  type DrawerDirection,
} from '@/services/drawer'
import { BankDrawer, BankDrawerHeaderLeft } from './bank-drawer'
import { ProfileMenuDrawer } from './profile-menu-drawer'
import { SelectBankDrawer } from './select-bank-drawer'
import { BankTransferDrawer } from './bank-transfer-drawer'
import { ShareTransferDrawer } from './share-transfer-drawer'
import { ProfileShareDrawer } from './profile-share-drawer'
import { RecommendBusinessDrawer } from './recommend-business-drawer'
import { RecommendBusinessSmsDrawer } from './recommend-business-sms-drawer'
import { ReceiptDrawer } from './receipt-drawer'
import { DateRangeFilterDrawer } from './date-range-filter-drawer'
import { PaymentMethodDrawer } from './payment-method-drawer'
import { RecordSuccessDrawer } from './record-success-drawer'
import { ObtainKitDrawer } from './obtain-kit-drawer'
import { CheckoutDrawer } from './checkout-drawer'
import { CurrentSaleDrawer } from './current-sale-drawer'
import { TransactionDetailsDrawer } from './transaction-details-drawer'
import { ConfirmCancelDrawer } from './confirm-cancel-drawer'
import { VariantSelectorDrawer } from './variant-selector-drawer'
import { SplitPaymentDrawer } from './split-payment-drawer'
import { CustomerSelectDrawer } from './customer-select-drawer'
import { CollectPaymentDrawer } from './collect-drawer'
import { TransactionOptionsDrawer } from './transaction-options-drawer'
import { ConfirmArchiveDrawer } from './confirm-archive-drawer'
import { SendReminderDrawer } from './send-reminder-drawer'
import { RepaymentSummaryDrawer } from './repayment-summary-drawer'
import { RepaymentSuccessDrawer } from './repayment-success-drawer'
import { AddCustomerDrawer } from './add-customer-drawer'
import { AccountSwitchDrawer } from './account-switch-drawer'
import { SaleReceiptDrawer } from './sale-receipt-drawer'
import { ActivityDetailsDrawer } from './activity-details-drawer'
import { ActivityOptionsDrawer } from './activity-options-drawer'
import { VerifyIdentityDrawer } from './verify-identity-drawer'
import { PlanCheckoutDrawer } from './plan-checkout-drawer'
import { CancelPlanDrawer } from './cancel-plan-drawer'
import { SaleItemsDrawer } from './sale-items-drawer'
import { DayTimeEditorDrawer } from './day-time-editor-drawer'
import { ActiveHoursBookingDrawer } from './active-hours-booking-drawer'

// Configuration for each drawer type
const DRAWER_CONFIG: Record<
  DrawerContentType,
  {
    title: string
    direction?: DrawerDirection
    HeaderLeft?: React.ComponentType
    Content: React.ElementType
    fullScreen?: boolean
    noHeader?: boolean
    hideHandle?: boolean
    dismissible?: boolean
  }
> = {
  'bank-accounts': {
    title: 'Bank accounts',
    HeaderLeft: BankDrawerHeaderLeft,
    Content: BankDrawer,
  },
  'profile-menu': {
    title: '',
    direction: 'left',
    fullScreen: true,
    Content: ProfileMenuDrawer,
  },
  'select-bank': {
    title: 'Transfer to',
    direction: 'bottom',
    Content: SelectBankDrawer,
  },
  'bank-transfer': {
    title: 'Send with bank app',
    direction: 'bottom',
    Content: BankTransferDrawer,
  },
  'share-transfer': {
    title: '',
    direction: 'bottom',
    Content: ShareTransferDrawer,
    fullScreen: true,
    noHeader: true,
  },
  'profile-share': {
    title: '',
    direction: 'bottom',
    Content: ProfileShareDrawer,
    fullScreen: true,
    noHeader: true,
  },
  'recommend-business': {
    title: '',
    direction: 'right',
    Content: RecommendBusinessDrawer,
    fullScreen: true,
    noHeader: true,
    hideHandle: true,
  },
  'recommend-business-sms': {
    title: '',
    direction: 'bottom',
    Content: RecommendBusinessSmsDrawer,
    noHeader: true,
  },
  'day-time-editor': {
    title: '',
    direction: 'bottom',
    Content: DayTimeEditorDrawer,
    noHeader: true,
  },
  'active-hours-booking': {
    title: '',
    direction: 'bottom',
    Content: ActiveHoursBookingDrawer,
    fullScreen: true,
    noHeader: true,
  },
  receipt: {
    title: 'Receipt',
    direction: 'right',
    fullScreen: true,
    Content: ReceiptDrawer,
  },
  'date-range-filter': {
    title: 'Filter',
    direction: 'bottom',
    Content: DateRangeFilterDrawer,
  },
  'payment-method': {
    title: '',
    Content: PaymentMethodDrawer,
    noHeader: true,
    fullScreen: true,
  },
  'record-success': {
    title: '',
    Content: RecordSuccessDrawer,
    noHeader: true,
    fullScreen: true,
    direction: 'right',
    hideHandle: true,
  },
  'obtain-kit': {
    title: '',
    Content: ObtainKitDrawer,
    noHeader: true,
    fullScreen: true,
    hideHandle: true,
  },
  'transaction-details': {
    title: '',
    Content: TransactionDetailsDrawer,
    noHeader: true,
    fullScreen: true,
    hideHandle: true,
    direction: 'right',
  },
  'sale-receipt': {
    title: '',
    Content: SaleReceiptDrawer,
    noHeader: true,
    fullScreen: true,
    hideHandle: true,
    direction: 'right',
  },
  'activity-details': {
    title: '',
    Content: ActivityDetailsDrawer,
    noHeader: true,
    fullScreen: true,
    hideHandle: true,
    direction: 'right',
  },
  'activity-options': {
    title: '',
    Content: ActivityOptionsDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'verify-identity': {
    title: '',
    Content: VerifyIdentityDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'plan-checkout': {
    title: '',
    Content: PlanCheckoutDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'cancel-plan': {
    title: '',
    Content: CancelPlanDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'sale-items': {
    title: '',
    Content: SaleItemsDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  checkout: {
    title: '',
    Content: CheckoutDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'checkout-sale': {
    title: '',
    Content: CurrentSaleDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'confirm-cancel': {
    title: '',
    Content: ConfirmCancelDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'variant-selector': {
    title: '',
    Content: VariantSelectorDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'split-payment': {
    title: '',
    Content: SplitPaymentDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'customer-select': {
    title: '',
    Content: CustomerSelectDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'collect-payment': {
    title: '',
    Content: CollectPaymentDrawer,
    noHeader: true,
    direction: 'right',
    fullScreen: true,
    hideHandle: true,
  },
  'transaction-options': {
    title: '',
    Content: TransactionOptionsDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'confirm-archive': {
    title: '',
    Content: ConfirmArchiveDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'send-reminder': {
    title: '',
    Content: SendReminderDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'repayment-summary': {
    title: '',
    Content: RepaymentSummaryDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'repayment-success': {
    title: '',
    Content: RepaymentSuccessDrawer,
    noHeader: true,
    direction: 'right',
    fullScreen: true,
    hideHandle: true,
  },
  'add-customer': {
    title: '',
    Content: AddCustomerDrawer,
    noHeader: true,
    direction: 'bottom',
  },
  'account-switch': {
    title: '',
    Content: AccountSwitchDrawer,
    noHeader: true,
    direction: 'bottom',
    dismissible: true,
  },
  custom: {
    title: '',
    Content: () => null,
  },
}

export function CustomDrawer() {
  const { configs, closeDrawer } = useDrawerStore()

  if (configs.length === 0) return null

  const renderDrawer = (index: number): React.ReactNode => {
    if (index >= configs.length) return null

    const config = configs[index]
    const drawerConfig = DRAWER_CONFIG[config.type]
    if (!drawerConfig) return null

    const {
      title,
      HeaderLeft,
      Content,
      direction,
      fullScreen,
      noHeader,
      hideHandle,
      dismissible = false,
    } = drawerConfig
    const drawerDirection = config.direction || direction || 'bottom'

    const handleClose = () => {
      closeDrawer(config.type)
    }

    const nextDrawer = renderDrawer(index + 1)

    // For full screen left/right drawers, render content directly without header
    if (
      fullScreen &&
      (drawerDirection === 'left' || drawerDirection === 'right')
    ) {
      return (
        <DrawerPrimitive
          key={`${config.type}-${index}`}
          open={true}
          onOpenChange={(open) => {
            if (!open && index === configs.length - 1) {
              handleClose()
            }
          }}
          direction={drawerDirection}
          dismissible={dismissible}
          repositionInputs={false}
        >
          <DrawerContent
            hideHandle={hideHandle}
            className="h-full w-full max-w-full bg-white"
          >
            <DrawerTitle className="sr-only">{title || 'Menu'}</DrawerTitle>
            <Content {...(config.props || {})} closeDrawer={handleClose} />
            {nextDrawer}
          </DrawerContent>
        </DrawerPrimitive>
      )
    }

    // For full screen bottom drawers, use near-full-screen height
    if (fullScreen && drawerDirection === 'bottom') {
      return (
        <DrawerPrimitive
          key={`${config.type}-${index}`}
          open={true}
          onOpenChange={(open) => {
            if (!open && index === configs.length - 1) {
              handleClose()
            }
          }}
          direction={drawerDirection}
          dismissible={dismissible}
          fixed
          repositionInputs={false}
        >
          <DrawerContent
            hideHandle={hideHandle}
            className={`${config.type === 'bank-transfer' || config.type === 'profile-share' || config.type === 'share-transfer' || config.type === 'obtain-kit' || config.type === 'collect-payment' ? 'bg-white' : 'bg-[#f4f6f8]'} max-w-125 mx-auto rounded-t-[32px]`}
          >
            {noHeader ? (
              <>
                <DrawerTitle className="sr-only">
                  {title || 'Share'}
                </DrawerTitle>
                <Content {...(config.props || {})} closeDrawer={handleClose} />
                {nextDrawer}
              </>
            ) : (
              <>
                {/* Header */}
                <DrawerHeader className="flex flex-row items-center justify-between py-1.5 px-4">
                  <div className="w-9 h-9 flex items-center justify-center">
                    {HeaderLeft && <HeaderLeft />}
                  </div>

                  <DrawerTitle className="font-bold text-base text-black">
                    {config.type === 'bank-transfer' ? (
                      <>
                        <p className="text-[#00000080] text-xs font-medium text-center leading-none flex items-center justify-center gap-0.5">
                          <Check size={16} color="#67CE67" />{' '}
                          <span>Account number copied</span>
                        </p>
                        <span className="text-base font-bold text-black leading-none mt-1 block text-center">
                          Open your bank app and paste
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-black leading-none mt-1 block text-center">
                        {title}
                      </span>
                    )}
                  </DrawerTitle>

                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close drawer"
                    className="w-9 h-9 flex items-center justify-center"
                  >
                    <X className="w-6 h-6 text-black" />
                  </button>
                </DrawerHeader>

                {/* Content */}
                <Content {...(config.props || {})} closeDrawer={handleClose} />
                {nextDrawer}
              </>
            )}
          </DrawerContent>
        </DrawerPrimitive>
      )
    }

    return (
      <DrawerPrimitive
        key={`${config.type}-${index}`}
        open={true}
        onOpenChange={(open) => {
          if (!open && index === configs.length - 1) {
            handleClose()
          }
        }}
        direction={drawerDirection}
        dismissible={dismissible}
        fixed={drawerDirection === 'bottom'}
        repositionInputs={false}
      >
        <DrawerContent
          hideHandle={hideHandle}
          className={`${
            [
              'bank-transfer',
              'checkout',
              'checkout-sale',
              'collect-payment',
              'variant-selector',
              'repayment-summary',
              'send-reminder',
              'recommend-business-sms',
              'add-customer',
              'plan-checkout',
              'cancel-plan',
            ].includes(config.type)
              ? 'bg-white'
              : 'bg-[#f5f6f8]'
          } max-w-125 mx-auto rounded-t-3xl data-[vaul-drawer-direction=bottom]:max-h-[80dvh] data-[vaul-drawer-direction=bottom]:overscroll-contain`}
        >
          {noHeader ? (
            <>
              <DrawerTitle className="sr-only">{title || 'Menu'}</DrawerTitle>
              <Content {...(config.props || {})} closeDrawer={handleClose} />
              {nextDrawer}
            </>
          ) : (
            <>
              {/* Header */}
              <DrawerHeader className="flex flex-row items-center justify-between py-1.5 px-4">
                <div className="w-9 h-9 flex items-center justify-center">
                  {HeaderLeft && <HeaderLeft />}
                </div>

                <DrawerTitle className="font-bold text-base text-black">
                  {config.type === 'bank-transfer' ? (
                    <>
                      <p className="text-[#00000080] text-xs font-medium text-center leading-none flex items-center justify-center gap-0.5">
                        <Check size={16} color="#67CE67" />{' '}
                        <span>Account number copied</span>
                      </p>
                      <span className="text-base font-bold text-black leading-none mt-1 block text-center">
                        Open your bank app and paste
                      </span>
                    </>
                  ) : (
                    title
                  )}
                </DrawerTitle>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close drawer"
                  className="w-9 h-9 flex items-center justify-center"
                >
                  <X className="w-6 h-6 text-black" />
                </button>
              </DrawerHeader>

              {/* Content */}
              <Content {...(config.props || {})} closeDrawer={handleClose} />
              {nextDrawer}
            </>
          )}
        </DrawerContent>
      </DrawerPrimitive>
    )
  }

  return <>{renderDrawer(0)}</>
}
