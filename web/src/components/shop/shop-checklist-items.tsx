import type { ShopSetupKey } from '@/services/shop'
import { ReactNode } from 'react'
import {
  AddressBookIcon,
  AddressBookTabsIcon,
  ArrowCircleUpRightIcon,
  BoxArrowUpIcon,
  CalendarDotsIcon,
  CubeIcon,
  FlagIcon,
  MapTrifoldIcon,
  QrCodeIcon,
  ScanSmileyIcon,
  SealCheckIcon,
  SealPercentIcon,
  StorefrontIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'

const FIRESPOT_GRADIENT = 'linear-gradient(135deg, #FB5012 0%, #D72483 100%)'

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
  requiredTier?: 'PROMAX'
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
    bg: FIRESPOT_GRADIENT,
    destination: { kind: 'route', href: '/settings/about' },
  },
  bank: {
    title: 'Where money lands',
    subtitle: 'Add a bank account for payouts',
    Icon: <ArrowCircleUpRightIcon weight="fill" size={24} color="white" />,
    bg: '#5DBE6F',
    destination: { kind: 'drawer', drawer: 'bank-accounts' },
  },
  verify: {
    title: 'More about you',
    subtitle: 'Provide required documents',
    Icon: <SealCheckIcon weight="fill" size={24} color="white" />,
    bg: '#3273F6',
    destination: { kind: 'route', href: '/verify?from=shop-setup' },
  },
  fulfillment: {
    title: 'How customers get your goods',
    subtitle: 'Setup order fulfillment',
    Icon: <BoxArrowUpIcon weight="fill" size={24} color="white" />,
    bg: '#549E67',
    destination: { kind: 'route', href: '/settings/fulfillment' },
  },
  locations: {
    title: 'Add shop locations',
    subtitle: 'Setup locations and landmarks',
    Icon: <MapTrifoldIcon weight="fill" size={24} color="white" />,
    bg: '#F09343',
    destination: { kind: 'route', href: '/settings/locations' },
  },
  employees: {
    title: 'Invite your employees',
    subtitle: 'Give controlled access to your staff',
    Icon: <UsersThreeIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'route', href: '/settings/employees' },
    requiredTier: 'PROMAX',
  },
  contact: {
    title: 'Add contact details',
    subtitle: 'How customers would reach you',
    Icon: <AddressBookIcon weight="fill" size={24} color="white" />,
    bg: '#3273F6',
    destination: { kind: 'route', href: '/settings/contact' },
  },
  firstItem: {
    title: 'What you sell',
    subtitle: 'Add your first product',
    Icon: <CubeIcon weight="fill" size={24} color="white" />,
    bg: FIRESPOT_GRADIENT,
    destination: { kind: 'route', href: '/products' },
  },
  bookings: {
    title: 'Bookings',
    subtitle: 'Setup services, tables and deposits',
    Icon: <ScanSmileyIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'none' },
  },
  policies: {
    title: 'How you operate',
    subtitle: "Your shop's policies",
    Icon: <FlagIcon weight="fill" size={24} color="white" />,
    bg: '#F09343',
    destination: { kind: 'route', href: '/settings/policies' },
  },
  operatingHours: {
    title: 'When you open and close',
    subtitle: 'Setup opening and closing times',
    Icon: <CalendarDotsIcon weight="fill" size={24} color="white" />,
    bg: '#EB445A',
    destination: { kind: 'route', href: '/settings/active-hours' },
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
    subtitle: 'Retain customers that visit your Shop',
    Icon: <QrCodeIcon weight="fill" size={24} color="white" />,
    bg: FIRESPOT_GRADIENT,
    destination: { kind: 'drawer', drawer: 'obtain-kit' },
  },
  suppliers: {
    title: 'Add supplier contacts',
    subtitle: 'Who you buy stock and services from',
    Icon: <AddressBookTabsIcon weight="fill" size={24} color="white" />,
    bg: '#3B9BF5',
    destination: { kind: 'route', href: '/suppliers' },
  },
}

/** Row order on screen, matching the design (independent of API order). */
export const CHECKLIST_ORDER: ShopSetupKey[] = [
  'contact',
  'locations',
  'about',
  'bank',
  'verify',
  'fulfillment',
  'operatingHours',
  'firstItem',
  'policies',
  'qrKit',
  'suppliers',
]
