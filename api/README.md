# Firespot Transfer API

> **Backend API for the Firespot Lite QR-based payment platform** — powering merchant onboarding, QR kit activation, scan tracking, agent management, and admin operations.

Built with [NestJS 11](https://nestjs.com) · TypeScript · MongoDB · Swagger

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schemas](#database-schemas)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Shared Services](#shared-services)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

Core capabilities:

- **Merchant Auth** — Phone-based OTP signup/login (via Termii SMS)
- **QR Kit Lifecycle** — Creation, activation (via Paystack payment), merchant binding
- **Bank Account Management** — Add, reorder, set primary (Paystack-verified)
- **Scan Analytics** — Track QR scans, account copies, merchant insights
- **Agent Management** — CRUD for field agents with referral codes and bank accounts
- **Admin Operations** — QR kit bulk creation, agent assignment, merchant oversight
- **Notifications** — SMS (Termii) + Email (Resend) for agent lifecycle events

---

## Tech Stack

| Category             | Technology                                                      |
| -------------------- | --------------------------------------------------------------- |
| **Framework**        | [NestJS 11](https://nestjs.com)                                 |
| **Language**         | TypeScript 5                                                    |
| **Database**         | MongoDB via [Mongoose 9](https://mongoosejs.com)                |
| **Authentication**   | Passport + JWT (separate tokens for merchants & admins)         |
| **Payments**         | [Paystack](https://paystack.com) (activation fees + webhooks)   |
| **SMS / OTP**        | [Termii](https://termii.com)                                    |
| **Email**            | [Resend](https://resend.com)                                    |
| **Image Upload**     | [Cloudinary](https://cloudinary.com) + Sharp                   |
| **QR Code Gen**      | `qrcode` (SVG generation → Cloudinary upload)                  |
| **API Docs**         | Swagger / OpenAPI (`@nestjs/swagger`)                           |
| **Validation**       | `class-validator` + `class-transformer`                         |
| **Password Hashing** | bcrypt                                                          |
| **Phone Parsing**    | `libphonenumber-js`                                             |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **MongoDB** instance (local or Atlas)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd firespot-transfer-page-api

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in all required values (see Environment Variables below)

# Seed the admin account
pnpm seed:admin

# Start development server (port 3001)
pnpm start:dev
```

### Swagger Documentation

Once running, interactive API docs are available at:

```
http://localhost:3001/api/docs
```

---

## Project Structure

```
src/
├── main.ts                           # Bootstrap, CORS, Swagger, global pipes
├── app.module.ts                     # Root module (imports all feature modules)
├── app.controller.ts                 # Health check endpoint
├── config/
│   └── database.config.ts            # MongoDB connection factory
├── schemas/                          # Mongoose schemas (shared)
│   ├── user.schema.ts                #   Merchant / user
│   ├── qrkit.schema.ts              #   QR kit
│   ├── scan.schema.ts               #   Scan event
│   └── bank-account.schema.ts       #   Bank account (embedded in User)
├── auth/                             # Merchant authentication
│   ├── auth.controller.ts            #   POST signup, login, verify-otp
│   ├── auth.service.ts               #   OTP logic, JWT issuance
│   ├── strategies/jwt.strategy.ts    #   Passport JWT strategy
│   ├── guards/jwt-auth.guard.ts      #   Route guard
│   ├── decorators/get-user.decorator.ts
│   └── dto/                          #   request-otp, signup, verify-otp
├── users/                            # Merchant account management
│   ├── users.controller.ts           #   14 endpoints (see API Reference)
│   ├── users.service.ts              #   Business logic
│   ├── dto/                          #   add-bank-account, setup-profile, etc.
│   └── services/
│       ├── cloudinary.service.ts     #   Image upload
│       └── paystack.service.ts       #   Bank verification
├── qr-kits/                          # QR kit public endpoints
│   ├── qr-kits.controller.ts        #   check, get, activate, verify-payment
│   └── qr-kits.service.ts           #   Activation flow + Paystack
├── payments/                          # Paystack webhook
│   ├── payments.controller.ts        #   POST webhook
│   └── payments.service.ts           #   Signature verification + processing
├── scans/                             # Scan tracking & insights
│   ├── scans.controller.ts           #   copy events, stats, insights
│   ├── scans.service.ts              #   Analytics aggregation
│   ├── dto/                          #   insights-query, record-copy
│   └── utils/device-detector.ts      #   User-agent parsing
├── admin/                             # Admin-only operations
│   ├── admin.module.ts               #   Aggregates all admin submodules
│   ├── admin-auth/                   #   Admin login (adminId + password)
│   │   ├── admin-auth.controller.ts  #     POST login, GET me
│   │   ├── admin-auth.service.ts     #     bcrypt + admin JWT
│   │   ├── strategies/               #     Separate JWT strategy
│   │   └── guards/                   #     AdminJwtAuthGuard
│   ├── qr-kits/                      #   QR kit management
│   │   ├── admin-qr-kits.controller.ts #   CRUD, bulk create, agent assignment
│   │   └── dto/                      #     create, bulk-create, assign
│   ├── agents/                       #   Agent management
│   │   ├── admin-agents.controller.ts #   CRUD, suspend, reactivate
│   │   └── dto/                      #     create, update, query
│   ├── merchants/                    #   Merchant oversight
│   │   └── admin-merchants.controller.ts # list, stats, detail
│   ├── schemas/
│   │   ├── admin.schema.ts           #   Admin user schema
│   │   └── agent.schema.ts           #   Agent schema
│   └── scripts/
│       └── seed-admin.ts             #   Admin seeding script
└── services/                          # Shared services
    ├── sms/sms.service.ts            #   Termii SMS integration
    ├── email/email.service.ts        #   Resend email integration
    ├── notifications/
    │   └── notification.service.ts   #   Agent lifecycle notifications
    └── qr-code.service.ts           #   QR code SVG generation
```

---

## Database Schemas

### User (Merchant)

| Field               | Type              | Description                               |
| ------------------- | ----------------- | ----------------------------------------- |
| `phoneNumber`       | string (unique)   | Local phone number                        |
| `phoneCountryCode`  | string            | Default: `+234`                           |
| `fullPhoneNumber`   | string (unique)   | Indexed for lookups                       |
| `otpCode`           | string?           | Current OTP (hashed)                      |
| `otpExpiresAt`      | Date?             | OTP expiration                            |
| `businessName`      | string?           | Derived from Paystack account name        |
| `merchantSlug`      | string? (unique)  | 6-char sharing slug                       |
| `bankAccounts`      | BankAccount[]     | Embedded array                            |
| `profilePhotoUrl`   | string?           | Cloudinary URL                            |
| `referredByAgent`   | ObjectId? → Agent | Agent referral link                       |

### QRKit

| Field               | Type              | Description                               |
| ------------------- | ----------------- | ----------------------------------------- |
| `serialNumber`      | string (unique)   | Physical QR kit identifier                |
| `merchantId`        | ObjectId? → User  | Linked after activation                   |
| `activationStatus`  | enum              | `pending` · `activated` · `deactivated`   |
| `paymentStatus`     | enum              | `pending` · `successful` · `failed`       |
| `activationAmount`  | number            | Default: 200000 (₦2,000 in kobo)         |
| `paystackReference` | string? (unique)  | Payment tracking                          |
| `agentId`           | ObjectId? → Agent | Field agent assignment                    |
| `qrCodeSvgUrl`      | string?           | Cloudinary SVG URL                        |

### Scan

| Field                 | Type              | Description                             |
| --------------------- | ----------------- | --------------------------------------- |
| `merchantId`          | ObjectId → User   | Merchant scanned                        |
| `qrKitId`             | ObjectId → QRKit  | QR kit scanned                          |
| `customerFingerprint` | string?           | Browser fingerprint for returning users |
| `ipAddress`           | string            | Client IP                               |
| `scannedAt`           | Date              | Scan timestamp                          |
| `accountCopied`       | boolean           | Whether bank details were copied        |
| `deviceType`          | string            | `mobile` · `tablet` · `desktop`         |

### BankAccount (embedded in User)

| Field           | Type    | Description                      |
| --------------- | ------- | -------------------------------- |
| `bankName`      | string  | Bank display name                |
| `bankCode`      | string  | Paystack bank code               |
| `accountNumber` | string  | 10-digit NUBAN                   |
| `accountName`   | string  | Paystack-verified account name   |
| `isPrimary`     | boolean | Primary account flag             |

### Admin

| Field       | Type    | Description                     |
| ----------- | ------- | ------------------------------- |
| `adminId`   | string  | Format: `ADM-001`               |
| `password`  | string  | bcrypt-hashed                   |
| `name`      | string  | Admin display name              |
| `role`      | string  | Default: `admin`                |
| `isActive`  | boolean | Account status                  |

### Agent

| Field          | Type    | Description                      |
| -------------- | ------- | -------------------------------- |
| `agentId`      | string  | Format: `AGT-001`                |
| `name`         | string  | Agent name                       |
| `phoneNumber`  | string  | Contact number                   |
| `email`        | string? | Email address                    |
| `state`        | string? | Nigerian state                   |
| `lga`          | string? | Local Government Area            |
| `status`       | enum    | `active` · `inactive` · `suspended` |
| `referralCode` | string? | 8-char merchant referral code    |
| `bankCode`     | string? | Paystack bank code               |
| `accountNumber`| string? | Agent bank account               |
| `subaccountCode` | string? | Paystack subaccount            |

---

## API Reference

All endpoints are prefixed with **`/api/v1`**.

### Auth (`/auth`)

| Method | Endpoint         | Auth | Description                                       |
| ------ | ---------------- | ---- | ------------------------------------------------- |
| POST   | `/signup`        | —    | Create account with bank details, sends OTP       |
| POST   | `/login`         | —    | Send OTP to existing user (rate-limited)          |
| POST   | `/verify-otp`    | —    | Verify OTP, returns JWT                           |

### Users (`/users`)

| Method | Endpoint                               | Auth | Description                          |
| ------ | -------------------------------------- | ---- | ------------------------------------ |
| GET    | `/banks`                               | —    | List all Nigerian banks (Paystack)   |
| POST   | `/resolve-account`                     | —    | Verify bank account (Paystack)       |
| POST   | `/bank-accounts`                       | JWT  | Add bank account                     |
| GET    | `/bank-accounts`                       | JWT  | List bank accounts                   |
| PATCH  | `/bank-accounts/:accountNumber/primary`| JWT  | Set primary bank account             |
| DELETE | `/bank-accounts/:accountNumber`        | JWT  | Remove bank account                  |
| PATCH  | `/photo`                               | JWT  | Upload profile photo (max 5MB)       |
| GET    | `/profile`                             | JWT  | Get user profile                     |
| GET    | `/qr-kits`                             | JWT  | List user's QR kits                  |
| GET    | `/qr-kits/:id`                         | JWT  | Get specific QR kit                  |
| PATCH  | `/merchant-slug`                       | JWT  | Update sharing slug                  |
| PATCH  | `/qr-kits/:id`                         | JWT  | Update QR kit name                   |

### QR Kits (`/qr-kits`)

| Method | Endpoint                          | Auth | Description                           |
| ------ | --------------------------------- | ---- | ------------------------------------- |
| GET    | `/:serialNumber/check`            | —    | Check serial number availability      |
| GET    | `/:serialNumber`                  | —    | Get merchant profile (customer scan)  |
| POST   | `/:serialNumber/activate`         | JWT  | Initiate activation + Paystack        |
| GET    | `/verify-payment/:reference`      | JWT  | Verify payment, complete activation   |

### Payments (`/payments`)

| Method | Endpoint     | Auth      | Description                       |
| ------ | ------------ | --------- | --------------------------------- |
| POST   | `/webhook`   | Signature | Paystack webhook receiver         |

### Scans (`/scans`)

| Method | Endpoint                      | Auth | Description                           |
| ------ | ----------------------------- | ---- | ------------------------------------- |
| POST   | `/copy/:serialNumber`         | —    | Record account copy event             |
| GET    | `/qr-kit/:qrKitId/count`     | JWT  | Scan count for a QR kit               |
| GET    | `/merchant/count`             | JWT  | Total scan count for merchant         |
| GET    | `/merchant/stats`             | JWT  | Merchant stats (scans, returning)     |
| GET    | `/merchant/insights`          | JWT  | Insights with date range filtering    |

### Admin Auth (`/admin/auth`)

| Method | Endpoint   | Auth      | Description                |
| ------ | ---------- | --------- | -------------------------- |
| POST   | `/login`   | —         | Admin login (adminId + pw) |
| GET    | `/me`      | Admin JWT | Get admin profile          |

### Admin QR Kits (`/admin/qr-kits`)

| Method | Endpoint               | Auth      | Description                         |
| ------ | ---------------------- | --------- | ----------------------------------- |
| POST   | `/`                    | Admin JWT | Create single QR kit                |
| POST   | `/bulk`                | Admin JWT | Create QR kits in bulk              |
| GET    | `/`                    | Admin JWT | List with filters + pagination      |
| GET    | `/stats`               | Admin JWT | QR kit statistics                   |
| GET    | `/:id`                 | Admin JWT | Get QR kit by ID                    |
| GET    | `/:id/download`        | Admin JWT | Download QR code SVG                |
| POST   | `/assign`              | Admin JWT | Assign QR kits to agent             |
| POST   | `/reassign`            | Admin JWT | Reassign to different agent         |
| POST   | `/unassign`            | Admin JWT | Unassign from agent                 |
| DELETE | `/:id`                 | Admin JWT | Delete QR kit                       |

### Admin Agents (`/admin/agents`)

| Method | Endpoint               | Auth      | Description                              |
| ------ | ---------------------- | --------- | ---------------------------------------- |
| POST   | `/`                    | Admin JWT | Create agent                             |
| GET    | `/`                    | Admin JWT | List agents (status/state/LGA filters)   |
| GET    | `/stats`               | Admin JWT | Agent statistics (by status + state)     |
| GET    | `/:id`                 | Admin JWT | Agent detail with QR kit stats           |
| GET    | `/:id/qr-kits`         | Admin JWT | Agent's assigned QR kits                 |
| PATCH  | `/:id`                 | Admin JWT | Update agent details                     |
| DELETE | `/:id`                 | Admin JWT | Deactivate (unassigns pending QR kits)   |
| PATCH  | `/:id/suspend`         | Admin JWT | Suspend agent                            |
| PATCH  | `/:id/reactivate`      | Admin JWT | Reactivate agent                         |

### Admin Merchants (`/admin/merchants`)

| Method | Endpoint     | Auth      | Description                    |
| ------ | ------------ | --------- | ------------------------------ |
| GET    | `/`          | Admin JWT | List merchants + pagination    |
| GET    | `/stats`     | Admin JWT | Merchant growth statistics     |
| GET    | `/:id`       | Admin JWT | Merchant detail with QR kits   |

---

## Authentication

The API uses **two separate JWT strategies**:

### Merchant Auth (OTP-based)
1. `POST /auth/signup` — Creates account with bank details, sends OTP via Termii SMS
2. `POST /auth/login` — Sends OTP to existing user (rate-limited: 5/hour, 60s cooldown)
3. `POST /auth/verify-otp` — Returns JWT (`token` in localStorage)

- Guard: `JwtAuthGuard`
- JWT secret: `JWT_SECRET`
- Swagger tag: `JWT-auth`

### Admin Auth (password-based)
1. `POST /admin/auth/login` — Authenticates with `adminId` + `password` (bcrypt)
2. Returns JWT (`admin_token` in localStorage)

- Guard: `AdminJwtAuthGuard`
- JWT secret: `ADMIN_JWT_SECRET`
- Swagger tag: `admin-jwt`

### Mock OTP

Set `MOCK_OTP=true` in `.env` to bypass real SMS delivery during development.

---

## Shared Services

| Service                | Module                | Description                                           |
| ---------------------- | --------------------- | ----------------------------------------------------- |
| **SmsService**         | `SmsModule`           | Termii SMS OTP delivery                               |
| **EmailService**       | `EmailModule`         | Email sending via Resend                               |
| **NotificationService**| `NotificationModule`  | Agent lifecycle notifications (welcome, suspend, etc.) |
| **QRCodeService**      | (standalone)          | QR code SVG generation and Cloudinary upload           |
| **PaystackService**    | `UsersModule`         | Bank list, account resolution, subaccount creation     |
| **CloudinaryService**  | `UsersModule`         | Profile photo upload and deletion                      |

### Notification Events

The `NotificationService` sends combined SMS + email for:
- **Agent Welcome** — On agent creation (with referral code)
- **Agent Suspended** — When admin suspends agent
- **Agent Deactivated** — When admin deactivates agent
- **Agent Reactivated** — When admin reactivates agent

---

## Environment Variables

```bash
# Application
PORT=3001                          # Server port
NODE_ENV=development               # development | production
FRONTEND_URL=http://localhost:3000 # CORS allowed origin
MOCK_OTP=true                      # Bypass Termii in development

# Database
MONGODB_URI=mongodb://...          # MongoDB connection string

# JWT
JWT_SECRET=                        # Merchant JWT secret
JWT_EXPIRES_IN=7d                  # Merchant token expiry
ADMIN_JWT_SECRET=                  # Admin JWT secret
ADMIN_JWT_EXPIRES_IN=24h           # Admin token expiry

# Termii (SMS / OTP)
TERMII_API_KEY=                    # Termii API key
TERMII_SENDER_ID=                  # SMS sender ID

# OTP Configuration
OTP_EXPIRY_MINUTES=10              # OTP validity window
OTP_LENGTH=6                       # OTP digit count

# Paystack
PAYSTACK_SECRET_KEY=               # Paystack secret key
QR_CODE_BASE_URL=                  # Base URL for QR code links

# Cloudinary
CLOUDINARY_CLOUD_NAME=             # Cloudinary cloud name
CLOUDINARY_API_KEY=                # Cloudinary API key
CLOUDINARY_API_SECRET=             # Cloudinary API secret

# Resend (Email)
SUPPORT_EMAIL=                     # Support email address

```

---

## Deployment

### Heroku

The project includes a `Procfile` for Heroku deployment:

```
web: npm run start:prod
```

```bash
# Build and deploy
pnpm build
# The start:prod script runs: node dist/main
```

### Other Platforms

```bash
# Build
pnpm build

# Run production
node dist/main
```

### Requirements
- Node.js ≥ 20
- MongoDB instance accessible from host
- All environment variables configured
- Paystack webhook URL configured in Paystack dashboard (`/api/v1/payments/webhook`)

---
