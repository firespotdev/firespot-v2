# Firespot Lite — QR Payment Merchant Frontend

> **Accept payments faster with QR codes.**
> Customer-facing web app for Firespot Lite — a QR-based payment platform that lets merchants receive bank transfers from any Nigerian bank via scannable QR kits.

**Live URL:** [lite.firespot.co](https://lite.firespot.co)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Services & API Layer](#services--api-layer)
- [State Management](#state-management)
- [UI Components](#ui-components)
- [Styling](#styling)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

Firespot Lite enables merchants to accept payments through physical QR code kits. Customers scan a QR code and are shown the merchant's bank account details for bank transfers. The platform includes:

- **QR Scanner** — Camera-based QR code scanning for customers to initiate payments.
- **Merchant Authentication** — Phone-based OTP login/signup flow.
- **Payment Flow** — Displays merchant bank accounts for customers to transfer money.
- **QR Kit Management** — Merchants can view and manage their assigned QR kits.
- **Bank Account Management** — Add, reorder, and set primary bank accounts with drag-and-drop.
- **Merchant Insights** — Analytics dashboard showing traffic, scan counts, bank copy breakdowns, and customer metrics.
- **Profile Management** — Business profile editing with photo upload via Cloudinary.
- **QR Kit Activation** — Purchase and activate QR kits through Paystack payment gateway.

---

## Tech Stack

| Category             | Technology                                                  |
| -------------------- | ----------------------------------------------------------- |
| **Framework**        | [Next.js 16](https://nextjs.org) (App Router)              |
| **Language**         | TypeScript 5                                                |
| **UI Library**       | React 19                                                    |
| **Styling**          | TailwindCSS 4 · CSS Variables · `tw-animate-css`            |
| **Component Library**| [shadcn/ui](https://ui.shadcn.com) (New York style)         |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs) (global store)     |
| **Data Fetching**    | [TanStack React Query](https://tanstack.com/query) + Axios  |
| **Forms**            | React Hook Form + Zod validation                            |
| **Payments**         | [Paystack](https://paystack.com)                            |
| **Image Hosting**    | [Cloudinary](https://cloudinary.com) via `next-cloudinary`  |
| **QR Codes**         | `qrcode.react` (generation) · `@zxing/library` (scanning)  |
| **Drag & Drop**      | `@dnd-kit/core` + `@dnd-kit/sortable`                      |
| **Animations**       | GSAP · Embla Carousel                                       |
| **Icons**            | Lucide React                                                |
| **Package Manager**  | pnpm (workspace)                                            |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd firespot-transfer-page

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

| Command        | Description                    |
| -------------- | ------------------------------ |
| `pnpm dev`     | Start development server       |
| `pnpm build`   | Build for production           |
| `pnpm start`   | Start production server        |
| `pnpm lint`    | Run ESLint                     |

---

## Project Structure

```
firespot-transfer-page/
├── public/                     # Static assets
│   ├── bank_logos/             #   Bank logo images
│   ├── fonts/                  #   Custom fonts (Satoshi, Sofia Pro)
│   ├── icons/                  #   SVG icons & branding assets
│   ├── images/                 #   OpenGraph thumbnails
│   └── sound/                  #   Audio assets (notifications)
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── activate/           #   QR kit activation flow
│   │   ├── bank-accounts/      #   Bank account management
│   │   │   └── add/            #     Add new bank account
│   │   ├── insights/           #   Merchant analytics dashboard
│   │   ├── login/              #   Phone-based OTP login
│   │   ├── pay/                #   Customer payment page
│   │   │   └── [serialNumber]/ #     Dynamic route per QR kit
│   │   ├── payment-status/     #   Payment verification status
│   │   ├── preview/            #   Merchant profile preview
│   │   ├── profile/            #   Merchant profile management
│   │   ├── qr-kits/            #   QR kit listing & details
│   │   │   └── [id]/           #     Individual QR kit detail
│   │   ├── signup/             #   Merchant registration
│   │   ├── layout.tsx          #   Root layout + providers
│   │   ├── page.tsx            #   Home page (QR scanner)
│   │   └── globals.css         #   Global styles & CSS variables
│   ├── components/
│   │   ├── activation/         #   QR kit activation components
│   │   ├── auth/               #   Login, signup, OTP forms
│   │   ├── bank-accounts/      #   Bank account card carousel
│   │   ├── custom-drawer/      #   Bottom sheet drawers
│   │   ├── insights/           #   Analytics stat cards & charts
│   │   ├── layout/             #   Page header, scroll-to-top
│   │   ├── qr-kits/            #   QR kit related components
│   │   └── ui/                 #   shadcn/ui + custom UI components
│   ├── hooks/                  #   Custom React hooks
│   ├── lib/
│   │   ├── fonts.ts            #   Font configuration
│   │   ├── utils.ts            #   shadcn utility (cn)
│   │   └── utils/              #   Utility modules
│   │       ├── axios.ts        #     Axios API clients
│   │       ├── constants.ts    #     Amount formatting, date utils
│   │       ├── bank-logos.ts   #     Bank logo mappings
│   │       ├── bank-deeplinks.ts #   Mobile banking deep links
│   │       ├── banks.ts        #     Bank list & utilities
│   │       ├── bank-account.ts #     Bank account helpers
│   │       ├── customer-fingerprint.ts # Customer device fingerprinting
│   │       ├── nigerian-states-lgas.ts # State/LGA reference data
│   │       ├── pdf-download.ts #     PDF generation helpers
│   │       └── svg-branding.ts #     QR code SVG branding
│   └── services/               # API service layer
│       ├── agents/             #   Agent management API
│       ├── auth/               #   Authentication API + store
│       ├── drawer/             #   Drawer state (Zustand store)
│       ├── insights/           #   Merchant analytics API
│       ├── paystack/           #   Paystack bank API
│       ├── qr/                 #   QR kit CRUD + store
│       ├── scans/              #   Scan tracking API
│       └── users/              #   User profile + bank account API
├── components.json             # shadcn/ui configuration
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── postcss.config.mjs          # PostCSS configuration
├── eslint.config.mjs           # ESLint configuration
└── package.json                # Dependencies & scripts
```

---

## Pages & Routes

| Route                     | Access     | Description                                                  |
| ------------------------- | ---------- | ------------------------------------------------------------ |
| `/`                       | Public     | QR code scanner (home page) with camera access & flashlight  |
| `/pay/[serialNumber]`     | Public     | Customer payment page — shows merchant bank accounts         |
| `/payment-status`         | Public     | Payment verification/confirmation status                     |
| `/login`                  | Public     | Phone number + OTP authentication                            |
| `/signup`                 | Public     | Merchant registration with bank account setup                |
| `/activate`               | Auth       | QR kit activation and payment via Paystack                   |
| `/profile`                | Auth       | Merchant profile with business details & photo               |
| `/preview`                | Auth       | Preview of public-facing merchant profile                    |
| `/bank-accounts`          | Auth       | Bank account management (reorder, set primary)               |
| `/bank-accounts/add`      | Auth       | Add new bank account with Paystack validation                |
| `/insights`               | Auth       | Analytics dashboard with traffic & scan metrics              |
| `/qr-kits`                | Auth       | List of merchant's QR kits                                   |
| `/qr-kits/[id]`          | Auth       | Individual QR kit details                                    |

---

## Services & API Layer

The `src/services/` directory is organized by domain. Each module typically contains:

- `interface.ts` — TypeScript type definitions
- `*Api.ts` — API call functions using Axios
- `*Slice.ts` — Zustand store (where applicable)
- `index.ts` — Barrel exports

### API Clients (`src/lib/utils/axios.ts`)

| Client              | Purpose                         | Auth              |
| ------------------- | ------------------------------- | ----------------- |
| `apiClient`         | Authenticated user requests     | Bearer JWT token  |
| `publicApiClient`   | Public endpoints (no auth)      | None              |
| `paystackApiClient` | Paystack API (bank validation)  | Paystack key      |

The backend API defaults to `http://localhost:3001/api/v1` and is configurable via `NEXT_PUBLIC_API_URL`.

### Service Modules

| Module       | Responsibilities                                                  |
| ------------ | ----------------------------------------------------------------- |
| **auth**     | Login, signup, OTP verification; auth state store (Zustand)       |
| **users**    | User profiles, bank accounts, QR kit activation, profile photos   |
| **qr**       | QR kit CRUD, merchant profile lookup, QR kit stats                |
| **paystack** | Bank list, account number validation                              |
| **insights** | Merchant analytics (traffic, scans, bank copies, date filtering)  |
| **scans**    | Scan count tracking, copy recording, merchant stats               |
| **agents**   | Agent management                                                  |
| **drawer**   | Global drawer state management (Zustand)                          |

---

## State Management

- **Zustand** — Used for global client-side state:
  - `authSlice` — Authentication state (user, token)
  - `drawerSlice` — Global bottom drawer state (open/close, config)
  - `qrSlice` — QR kit-related state

- **TanStack React Query** — Server state management for API data fetching, caching (5-minute stale time), and synchronization. Configured in `src/components/providers.tsx`.

- **localStorage** — JWT token persistence for authenticated sessions.

---

## UI Components

### shadcn/ui Components (`src/components/ui/`)

Pre-built, customizable components using Radix UI primitives:

`Avatar` · `Badge` · `Button` · `Card` · `Carousel` · `Dialog` · `Drawer` · `Dropdown Menu` · `Form` · `Input` · `Label` · `Select` · `Separator` · `Skeleton` · `Sonner` (toasts) · `Switch`

### Custom Components

| Component                  | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `BankLogo`                 | Renders bank logos with fallback                     |
| `CTACarousel`              | Auto-playing call-to-action carousel                 |
| `ConfirmDialog`            | Confirmation modal dialog                            |
| `DonutChart`               | SVG donut chart for insights                         |
| `LoaderCircle`             | Loading spinner                                      |
| `NotificationToast`        | Custom toast notifications                           |
| `PhoneInput`               | Phone number input with country code                 |
| `TagFooter`                | Branded footer tag                                   |
| `ProfilePhotoUpload`       | Cloudinary-powered photo upload                      |

### Drawer System (`src/components/custom-drawer/`)

A global drawer system managed by Zustand, supporting multiple drawer types:

`BankDrawer` · `BankTransferDrawer` · `DateRangeFilterDrawer` · `ProfileMenuDrawer` · `ReceiptDrawer` · `SelectBankDrawer` · `ShareTransferDrawer`

#### How to use the Drawer System

The drawer system is a **global, type-safe bottom/side sheet** controlled by a Zustand store. A single `<CustomDrawer />` component is mounted in the root layout and renders the correct drawer content based on a `type` key.

**1. Open a drawer** — call `openDrawer()` from the Zustand store with a config object:

```tsx
import { useDrawerStore } from '@/services/drawer'

function MyComponent() {
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const handleClick = () => {
    openDrawer({
      type: 'bank-accounts',           // DrawerContentType (see types below)
      direction: 'bottom',              // optional: 'left' | 'right' | 'top' | 'bottom'
      props: {                          // optional: passed to the drawer content component
        bankAccounts: [...],
      },
    })
  }
}
```

**2. Close a drawer** — call `closeDrawer()` or use the convenience hook:

```tsx
import { useCloseDrawer } from '@/services/drawer'

function InsideDrawer() {
  const closeDrawer = useCloseDrawer()
  return <button onClick={closeDrawer}>Done</button>
}
```

**3. Available drawer types** (`DrawerContentType`):

| Type                  | Direction | Full Screen | Description                         |
| --------------------- | --------- | ----------- | ----------------------------------- |
| `bank-accounts`       | bottom    | No          | Reorderable bank account list       |
| `profile-menu`        | left      | Yes         | Side navigation / profile menu      |
| `select-bank`         | bottom    | No          | Bank account picker                 |
| `bank-transfer`       | bottom    | No          | "Open bank app" deep-link sheet     |
| `share-transfer`      | bottom    | Yes         | Share merchant transfer link        |
| `receipt`             | right     | Yes         | Full-screen receipt view            |
| `date-range-filter`   | bottom    | No          | Date range picker for insights      |
| `custom`              | bottom    | No          | Custom/empty drawer                 |

**4. Passing callbacks via `props`** — drawers receive props and a `closeDrawer` function:

```tsx
openDrawer({
  type: 'date-range-filter',
  props: {
    currentFilter: filter,
    onApply: (newFilter) => setFilter(newFilter),   // callback from parent
  },
})
```

**5. Adding a new drawer type:**
1. Define the new type in `src/services/drawer/interface.ts` (`DrawerContentType` union).
2. Create the drawer content component in `src/components/custom-drawer/`.
3. Register it in the `DRAWER_CONFIG` map inside `src/components/custom-drawer/drawer.tsx`.

---

### Notification Toast

The project provides a custom pill-shaped toast via `showNotificationToast()`, built on top of [Sonner](https://sonner.emilkowal.dev). The `<Toaster>` is already mounted in the root layout — you only need to call the function.

#### Usage

```tsx
import { showNotificationToast } from '@/components/ui'

// Basic usage
showNotificationToast({ message: 'Account number copied!' })

// With custom duration (default: 3000ms)
showNotificationToast({
  message: 'Link copied to clipboard',
  duration: 2000,
})

// With a custom Lucide icon (default: Check ✓)
import { Copy } from 'lucide-react'

showNotificationToast({
  message: 'Copied!',
  icon: Copy,
})
```

#### API Reference

```ts
showNotificationToast({
  message: string        // Required — text to display
  icon?: LucideIcon      // Optional — Lucide icon component (default: Check)
  duration?: number      // Optional — auto-dismiss in ms (default: 3000)
})
```

The toast renders as a centered, white pill with a green icon circle, the message text, and a dismiss `✕` button. Styling is defined inline in `src/components/ui/notification-toast.tsx`.

> **Note:** For standard Sonner toasts (success, error, info, warning), you can also use `toast.success(...)` / `toast.error(...)` etc. directly from the `sonner` package — the themed `<Toaster>` in the layout handles those automatically.

---

## Styling

- **TailwindCSS 4** with CSS custom properties for theming (light/dark mode support)
- **Custom fonts**: Satoshi (primary) and Sofia Pro (accent) loaded via `next/font` in `src/lib/fonts.ts`
- **Design tokens**: Defined in `globals.css` using `oklch` color space for consistent theming
- **Component overrides**: Custom Sonner toast positioning for centered, fit-content toasts
- **Scrollbar hiding**: Utility class `.scrollbar-hide` for clean UIs

---

## Environment Variables

| Variable                          | Required | Description                         |
| --------------------------------- | -------- | ----------------------------------- |
| `NEXT_PUBLIC_API_URL`             | Yes      | Backend API base URL                |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes      | Paystack public key for payments    |

Create a `.env` file in the project root with these values. See `.env.example` for reference.

---

## Deployment

The project is deployed on [Vercel](https://vercel.com). Configuration is stored in `.vercel/`.

```bash
# Production build
pnpm build

# Start production server
pnpm start
```

### Image Optimization

Remote images from Cloudinary (`res.cloudinary.com`) are configured in `next.config.ts` for Next.js Image optimization.

### React Compiler

The React Compiler is enabled in `next.config.ts` (`reactCompiler: true`) for automatic memoization optimizations.
