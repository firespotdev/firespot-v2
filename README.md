# Firespot Admin — QR Kit Management Dashboard

> **Internal admin portal for managing QR kits, agents, and merchants on the Firespot Lite platform.**

This project was extracted from the main [firespot-two](../firespot-two) codebase into a standalone admin dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [Admin Tabs & Features](#admin-tabs--features)
- [Services & API Layer](#services--api-layer)
- [UI Components](#ui-components)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

Firespot Admin is an internal dashboard for platform administrators to manage the Firespot Lite ecosystem. Key capabilities:

- **Dashboard** — Overview stats for QR kits (total, pending, activated, deactivated) and payment statuses, plus merchant growth metrics.
- **Create QR Codes** — Generate single or bulk QR kits, optionally assigned to an agent.
- **QR Kits Management** — List, search, filter, and view details of all QR kits. Includes branded QR code rendering, PDF export, and batch ZIP download.
- **Agent Management** — Full CRUD for agents (create, view, edit, update status). Filter by state, LGA, status. View agent stats including assigned QR kits and referral counts.
- **Merchant Management** — Browse and search all registered merchants with details on their QR kits, bank accounts, and activity.

---

## Tech Stack

| Category             | Technology                                                  |
| -------------------- | ----------------------------------------------------------- |
| **Framework**        | [Next.js 16](https://nextjs.org) (App Router)              |
| **Language**         | TypeScript 5                                                |
| **UI Library**       | React 19                                                    |
| **Styling**          | TailwindCSS 4 · CSS Variables · `tw-animate-css`            |
| **Component Library**| [shadcn/ui](https://ui.shadcn.com) (New York style)         |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs)                     |
| **Data Fetching**    | [TanStack React Query](https://tanstack.com/query) + Axios  |
| **Forms**            | React Hook Form + Zod validation                            |
| **QR Codes**         | `qrcode.react` (generation) · SVG branding pipeline         |
| **PDF/Export**       | `jspdf` (single PDF) · `jszip` (batch ZIP download)         |
| **Image Hosting**    | [Cloudinary](https://cloudinary.com) via `next-cloudinary`  |
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
cd firespot-two-admin

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Start development server (runs on port 3002)
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002) to view the dashboard.

### Available Scripts

| Command        | Description                           |
| -------------- | ------------------------------------- |
| `pnpm dev`     | Start dev server on port **3002**     |
| `pnpm build`   | Build for production                  |
| `pnpm start`   | Start production server               |
| `pnpm lint`    | Run ESLint                            |

---

## Project Structure

```
firespot-two-admin/
├── public/                        # Static assets
│   ├── bank_logos/                 #   Bank logo images
│   ├── fonts/                     #   Custom fonts (Satoshi, Sofia Pro)
│   ├── icons/                     #   SVG icons & branding assets
│   └── images/                    #   Misc images
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── login/                 #   Admin login page
│   │   ├── layout.tsx             #   Root layout + providers
│   │   ├── page.tsx               #   Home (→ AdminAuthGuard + AdminLayout)
│   │   └── globals.css            #   Global styles & CSS variables
│   ├── components/
│   │   ├── admin/                 #   Admin-specific components
│   │   │   ├── AdminAuthGuard.tsx  #     Auth wrapper (login gate)
│   │   │   ├── AdminDashboard.tsx  #     Dashboard stats view
│   │   │   ├── AdminLayout.tsx     #     Main layout with tab navigation
│   │   │   ├── AdminLogin.tsx      #     Login form
│   │   │   ├── AdminToast.tsx      #     Toast notifications
│   │   │   ├── AgentsList.tsx      #     Agent listing + filters
│   │   │   ├── AgentDetail.tsx     #     Agent detail modal
│   │   │   ├── AgentForm.tsx       #     Agent create/edit form
│   │   │   ├── AgentSelect.tsx     #     Agent picker dropdown
│   │   │   ├── CreateAgent.tsx     #     Create agent flow
│   │   │   ├── CreateQRCodes.tsx   #     QR kit creation (single/bulk)
│   │   │   ├── MerchantsList.tsx   #     Merchant listing + search
│   │   │   ├── QRCodeBrander.tsx   #     Branded QR code renderer
│   │   │   ├── QRKitCard.tsx       #     QR kit card component
│   │   │   ├── QRKitDetail.tsx     #     QR kit detail modal
│   │   │   └── QRKitsList.tsx      #     QR kit listing + filters
│   │   ├── providers.tsx          #   React Query + Progress providers
│   │   └── ui/                    #   shadcn/ui + custom components (23 files)
│   ├── lib/
│   │   ├── fonts.ts               #   Font configuration
│   │   ├── utils.ts               #   shadcn utility (cn)
│   │   └── utils/                 #   Utility modules
│   │       ├── axios.ts           #     Axios API clients
│   │       ├── constants.ts       #     Formatting helpers
│   │       ├── batch-pdf-download.ts #  Batch QR kit ZIP export
│   │       ├── pdf-download.ts    #     Single QR kit PDF export
│   │       ├── svg-branding.ts    #     QR code SVG branding pipeline
│   │       ├── customer-fingerprint.ts
│   │       └── nigerian-states-lgas.ts
│   └── services/                  # API service layer
│       ├── admin/                 #   Admin auth (login, logout, token)
│       ├── agents/                #   Agent CRUD + stats
│       ├── auth/                  #   User auth types (shared)
│       ├── merchants/             #   Merchant listing + stats
│       ├── paystack/              #   Paystack bank validation
│       ├── qr/                    #   QR kit CRUD + stats + store
│       └── scans/                 #   Scan tracking
├── components.json                # shadcn/ui configuration
├── next.config.ts                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies & scripts
```

---

## Authentication

The admin portal uses a dedicated **adminId + password** login flow (separate from the merchant OTP-based auth).

- **Login** — Admins authenticate via `POST /admin/auth/login` with `{ adminId, password }`.
- **Token storage** — JWT is stored in `localStorage` under `admin_token`; admin info under `admin_info`.
- **Auth guard** — The `AdminAuthGuard` component wraps the entire app. If no valid admin token is found, the `AdminLogin` form is rendered instead.
- **API client** — All admin API calls use `adminApiClient` (from `src/lib/utils/axios.ts`), which automatically injects the `admin_token` as a Bearer token.
- **401 handling** — On a 401 response, the admin token and info are cleared from localStorage and the user is redirected to login.

---

## Admin Tabs & Features

The admin dashboard is a **single-page application** with client-side tab navigation managed by `AdminLayout`. There are 5 main tabs:

| Tab               | Component          | Description                                                    |
| ------------------ | ------------------ | -------------------------------------------------------------- |
| **Dashboard**      | `AdminDashboard`   | QR kit stats (total, by activation/payment status) + merchant growth metrics (total, new today/week/month, activation rate) |
| **Create QR Codes**| `CreateQRCodes`    | Generate single or bulk QR kits with optional agent assignment |
| **QR Kits**        | `QRKitsList`       | Paginated list with filters (activation status, payment status, agent, search). Click to view `QRKitDetail` modal |
| **Agents**         | `AgentsList`       | Agent table with status/state/LGA filters. View `AgentDetail`, or create via `CreateAgent` |
| **Merchants**      | `MerchantsList`    | Merchant table with search and active/inactive filter          |

### QR Kit Detail Features
- View full QR kit info (serial, status, merchant, agent)
- **Branded QR code** rendering via `QRCodeBrander` (applies gradient + logo branding to SVG)
- **PDF export** — single QR kit download as branded PDF
- **Batch ZIP download** — download multiple branded QR codes as a ZIP file

### Agent Management
- Create agents with name, phone, email, state, LGA, bus stop, bank details
- View agent stats (QR kits assigned, activation breakdown, referral count)
- Update agent status (active / inactive / suspended)
- Paystack bank account validation for agent bank details

---

## Services & API Layer

### API Clients (`src/lib/utils/axios.ts`)

| Client              | Purpose                            | Auth                      |
| ------------------- | ---------------------------------- | ------------------------- |
| `adminApiClient`    | Admin-authenticated requests       | Bearer `admin_token`      |
| `apiClient`         | User-authenticated requests        | Bearer `token`            |
| `publicApiClient`   | Public endpoints (no auth)         | None                      |
| `paystackApiClient` | Paystack API (bank validation)     | Paystack public key       |

The backend API defaults to `http://localhost:3001/api/v1` (shared with the main frontend).

### Service Modules

| Module        | Responsibilities                                                    |
| ------------- | ------------------------------------------------------------------- |
| **admin**     | Admin login, logout, token management, auth check                   |
| **agents**    | Agent CRUD, stats, status updates, filtering                        |
| **auth**      | Shared user auth types (User, LoginPayload, etc.)                   |
| **merchants** | Merchant listing, stats (total, new, activation rate), filtering    |
| **paystack**  | Bank list, account number validation                                |
| **qr**        | QR kit CRUD, bulk creation, stats, merchant profile lookup, store   |
| **scans**     | Scan tracking and stats                                             |

---

## UI Components

### shadcn/ui Components (`src/components/ui/`)

Pre-built, Radix-based primitives:

`Avatar` · `Badge` · `Button` · `Card` · `Confirm Dialog` · `Dialog` · `Donut Chart` · `Drawer` · `Dropdown Menu` · `Form` · `Input` · `Label` · `Loader Circle` · `Notification Toast` · `Phone Input` · `Select` · `Separator` · `Skeleton` · `Sonner` · `Spinner` · `Switch` · `Tag Footer`

### Notification Toast

Same pattern as the main project — use `showNotificationToast()`:

```tsx
import { showNotificationToast } from '@/components/ui'

showNotificationToast({ message: 'QR kit created successfully!' })
```

---

## Environment Variables

| Variable                          | Required | Description                         |
| --------------------------------- | -------- | ----------------------------------- |
| `NEXT_PUBLIC_API_URL`             | Yes      | Backend API base URL                |

Create a `.env` file in the project root. See `.env.example` for reference.

---

## Deployment

The project can be deployed on [Vercel](https://vercel.com) or any Node.js hosting platform.

```bash
# Production build
pnpm build

# Start production server
pnpm start
```

### Image Optimization

Remote images from Cloudinary (`res.cloudinary.com`) are configured in `next.config.ts` for Next.js Image optimization.

### React Compiler

The React Compiler is enabled (`reactCompiler: true`) for automatic memoization optimizations.

---

## Relationship to Main Project

This admin portal shares the same backend API as [firespot-two](../firespot-two) (the merchant/customer-facing frontend). It was extracted into a separate project to:

- Separate admin and customer concerns
- Allow independent deployment and access control
- Reduce bundle size for the customer-facing app
