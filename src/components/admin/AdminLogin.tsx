'use client'

import { useState } from 'react'
import { useAdminLogin } from '@/services/admin'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const loginMutation = useAdminLogin()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginMutation.mutateAsync({ adminId, password })
      router.push('/admin')
      router.refresh()
    } catch (error) {
      // Error is handled by mutation
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-black">Admin Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="adminId"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Admin ID
            </label>
            <input
              id="adminId"
              type="text"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="ADM-001"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-black focus:outline-none"
            />
          </div>

          {loginMutation.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {loginMutation.error && 'response' in loginMutation.error
                ? (loginMutation.error as any).response?.data?.message ||
                  'Invalid credentials'
                : 'Invalid credentials'}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-black px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
