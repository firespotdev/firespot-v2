'use client'

import { useState } from 'react'
import { useAdminLogout, getAdminInfo } from '@/services/admin'
import type { QRKit } from '@/services/qr'
import type { Agent } from '@/services/agents'
import type { Merchant } from '@/services/merchants'
import AdminDashboard from './AdminDashboard'
import CreateQRCodes from './CreateQRCodes'
import QRKitsList from './QRKitsList'
import QRKitDetail from './QRKitDetail'
import AgentsList from './AgentsList'
import AgentDetail from './AgentDetail'
import CreateAgent from './CreateAgent'
import MerchantsList from './MerchantsList'

type Tab = 'dashboard' | 'create' | 'list' | 'agents' | 'create-agent' | 'merchants'

const GRADIENT_START = '#FB5012'
const GRADIENT_END = '#D72483'

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [selectedQRKit, setSelectedQRKit] = useState<QRKit | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const logout = useAdminLogout()
  const adminInfo = getAdminInfo()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: 'create',
      label: 'Create QR Codes',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
    },
    {
      id: 'list',
      label: 'QR Kits',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      ),
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      id: 'merchants',
      label: 'Merchants',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ]

  const handleSelectQRKit = (qrKit: QRKit) => {
    setSelectedQRKit(qrKit)
  }

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const handleSelectMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
  }

  const handleCreateAgent = () => {
    setActiveTab('create-agent')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-2"
              style={{
                background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
              }}
            >
              <svg
                className="h-6 w-6 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Firespot Admin
              </h1>
              <p className="text-xs text-gray-500">QR Kit Management</p>
            </div>
          </div>

          {adminInfo && (
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {adminInfo.name}
                </p>
                <p className="text-xs text-gray-500">{adminInfo.adminId}</p>
              </div>
              <div
                className="hidden h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white sm:flex"
                style={{
                  background: `linear-gradient(134.65deg, ${GRADIENT_START} 0.32%, ${GRADIENT_END} 100.3%)`,
                }}
              >
                {adminInfo.name?.charAt(0) || 'A'}
              </div>
              <button
                onClick={logout}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#FB5012] text-[#FB5012]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'create' && <CreateQRCodes />}
        {activeTab === 'list' && (
          <QRKitsList onSelectQRKit={handleSelectQRKit} />
        )}
        {activeTab === 'agents' && (
          <AgentsList
            onSelectAgent={handleSelectAgent}
            onCreateAgent={handleCreateAgent}
          />
        )}
        {activeTab === 'create-agent' && (
          <CreateAgent onSuccess={() => setActiveTab('agents')} />
        )}
        {activeTab === 'merchants' && (
          <MerchantsList onSelectMerchant={handleSelectMerchant} />
        )}
      </main>

      {selectedQRKit && (
        <QRKitDetail
          qrKit={selectedQRKit}
          onClose={() => setSelectedQRKit(null)}
        />
      )}

      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
