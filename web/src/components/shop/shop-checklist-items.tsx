import type { ShopSetupKey } from '@/services/shop'
import { ReactNode } from 'react'
import {
  AddressBookTabsIcon,
  ArrowCircleUpRightIcon,
  HourglassMediumIcon,
  HouseIcon,
  PackageIcon,
  QrCodeIcon,
  ScanSmileyIcon,
  ScrollIcon,
  SealCheckIcon,
  SealPercentIcon,
  StorefrontIcon,
  TruckIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'

/** Where tapping an actionable row goes. */
export type ChecklistDestination =
  | { kind: 'route'; href: string }
  | { kind: 'drawer'; drawer: 'bank-accounts' | 'obtain-kit' }
  | { kind: 'none' } // detection-only: no dedicated screen (set at onboarding)

export interface ChecklistItemMeta {
  title: string
  subtitle: string
  Icon: ReactNode
  /** Any CSS `background` — solid or gradient. */
  bg: string
  destination: ChecklistDestination
}

/**
 * Presentation + routing for every checklist row. Completion and the
 * locked/actionable split come from the server (`GET /users/me/shop-setup`);
 * this only supplies copy, icon and destination.
 */
export const CHECKLIST_META: Record<ShopSetupKey, ChecklistItemMeta> = {
  about: {
    title: 'About your Shop',
    subtitle: 'Set a business name and description',
    Icon: <StorefrontIcon weight="fill" size={24} color="white" />,
    bg: 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
    destination: { kind: 'none' },
  },
  bank: {
    title: 'Where money lands',
    subtitle: 'Add a bank account for payouts',
    Icon: <ArrowCircleUpRightIcon weight="fill" size={24} color="white" />,
    bg: '#24C166',
    destination: { kind: 'drawer', drawer: 'bank-accounts' },
  },
  verify: {
    title: 'Verify your identity',
    subtitle: 'Provide required documents',
    Icon: <SealCheckIcon weight="fill" size={24} color="white" />,
    bg: '#2F5BFF',
    destination: { kind: 'route', href: '/verify' },
  },
  fulfillment: {
    title: 'How customers get your goods',
    subtitle: 'Setup order fulfillment',
    Icon: <TruckIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'route', href: '/settings/fulfillment' },
  },
  locations: {
    title: "Your shop's spots",
    subtitle: 'Setup locations and landmarks',
    Icon: <HouseIcon weight="fill" size={24} color="white" />,
    bg: '#F5A623',
    destination: { kind: 'route', href: '/settings/locations' },
  },
  employees: {
    title: 'Invite your employees',
    subtitle: 'Give controlled access to your staff',
    Icon: <UsersThreeIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  contact: {
    title: 'Add contact details',
    subtitle: 'Add your business contact details',
    Icon: <UserCircleIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'route', href: '/settings/contact' },
  },
  firstItem: {
    title: 'Add your first item',
    subtitle: 'Photo, name and price',
    Icon: <PackageIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  bookings: {
    title: 'Bookings',
    subtitle: 'Setup services, tables and deposits',
    Icon: <ScanSmileyIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  policies: {
    title: 'Shop policies',
    subtitle: 'Set your shop policies',
    Icon: <ScrollIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  operatingHours: {
    title: 'Operating hours',
    subtitle: 'Setup opening and closing times',
    Icon: <HourglassMediumIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  charges: {
    title: 'Charges & taxes',
    subtitle: 'Set charges and taxes',
    Icon: <SealPercentIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  qrKit: {
    title: 'Get a QR kit',
    subtitle: 'Order a QR kit for your shop',
    Icon: <QrCodeIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'drawer', drawer: 'obtain-kit' },
  },
  suppliers: {
    title: 'Add supplier contacts',
    subtitle: 'Add supplier contacts',
    Icon: <AddressBookTabsIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
}

/** Row order on screen, matching the design (independent of API order). */
export const CHECKLIST_ORDER: ShopSetupKey[] = [
  'about',
  'bank',
  'verify',
  'fulfillment',
  'locations',
  'employees',
  'contact',
  'firstItem',
  'bookings',
  'policies',
  'operatingHours',
  'charges',
  'qrKit',
  'suppliers',
]
