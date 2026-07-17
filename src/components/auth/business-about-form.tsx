'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Store, Upload } from 'lucide-react'
import {
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Spinner,
} from '@/components/ui'
import { useIndustries, useUpdateProfilePhoto } from '@/services/users'

const DESCRIPTION_MAX_LENGTH = 160

interface BusinessAboutFormProps {
  businessName: string
  onBusinessNameChange: (value: string) => void
  industry: string
  onIndustryChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  error?: string
}

export function BusinessAboutForm({
  businessName,
  onBusinessNameChange,
  industry,
  onIndustryChange,
  description,
  onDescriptionChange,
  onSubmit,
  error,
}: BusinessAboutFormProps) {
  const { data: industries = [], isLoading: industriesLoading } =
    useIndustries()
  const updatePhoto = useUpdateProfilePhoto()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    updatePhoto.mutate(file)
  }

  return (
    <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col w-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Logo upload */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#CED7E1] flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Business logo"
                width={56}
                height={56}
                unoptimized
                className="object-cover w-full h-full"
              />
            ) : (
              <Image
                src="/icons/store_solid.svg"
                alt="Business logo"
                width={40}
                height={40}
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={updatePhoto.isPending}
            className="bg-[#F1F1F1] rounded-full h-9 px-4 flex items-center gap-2 text-[10px] font-bold tracking-[1px] text-black uppercase disabled:opacity-50"
          >
            {updatePhoto.isPending ? (
              <Spinner />
            ) : (
              <>
                <Upload size={16} />
                Upload your logo
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleLogoSelect}
            className="hidden"
          />
        </div>

        <div className="space-y-6">
          <div>
            <Label>Business name</Label>
            <Input
              type="text"
              placeholder="Enter your business name"
              className="w-full font-medium"
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
            />
          </div>

          <div>
            <Label>Industry</Label>
            <Select
              value={industry}
              onValueChange={onIndustryChange}
              disabled={industriesLoading}
            >
              <SelectTrigger className="font-medium">
                <SelectValue
                  placeholder={industriesLoading ? 'Loading...' : 'Select one'}
                >
                  {industry || 'Select one'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {industries.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Label className="text-xs leading-none">
                ({description.length}/{DESCRIPTION_MAX_LENGTH})
              </Label>
            </div>
            <textarea
              placeholder="Enter a brief description of your business"
              value={description}
              maxLength={DESCRIPTION_MAX_LENGTH}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full min-h-24 rounded-md border border-[#DDDDDD] bg-transparent px-4 py-3 text-base font-medium placeholder:text-[#9CA3AF] placeholder:font-normal outline-none resize-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="text-[#FF002E] text-xs font-medium flex items-center gap-1 mt-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF002E] text-white text-xs flex items-center justify-center">
              !
            </span>
            {error}
          </p>
        )}
      </div>

      {/* Bottom-stuck footer: divider sits 16px above the button */}
      <div className="shrink-0 -mx-4 border-t border-[#F1F1F1] px-4 pt-4 rounded-t-[12px]">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  )
}
