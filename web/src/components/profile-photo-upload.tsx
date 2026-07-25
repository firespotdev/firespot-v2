'use client'

import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/utils/axios'
import { useAuthStore } from '@/services/auth'
import { toast } from 'sonner'

interface ProfilePhotoUploadProps {
  photoUrl?: string
  businessName: string
}

export function ProfilePhotoUpload({
  photoUrl,
  businessName,
}: ProfilePhotoUploadProps) {
  const { user, updateUser } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('photo', file)

      const response = await apiClient.patch('/users/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (user) {
        updateUser({
          ...user,
          profilePhotoUrl: response.data.profilePhotoUrl,
        })
      }

      toast.success('Profile photo updated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
        <AvatarImage src={photoUrl} alt={businessName} />
        <AvatarFallback className="bg-linear-to-br from-orange-400 to-pink-500 text-white text-3xl">
          {businessName ? getInitials(businessName) : '?'}
        </AvatarFallback>
      </Avatar>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Camera className="w-5 h-5 text-gray-700" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
