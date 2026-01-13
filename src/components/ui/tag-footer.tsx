import Image from 'next/image'

const TagFooter = () => {
  return (
    <div className="p-4 py-6 flex justify-center">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-[#64748B]">Powered by</span>
        <Image
          src="/icons/brand_black.svg"
          alt="firespot logo"
          width={81}
          height={24}
        />
      </div>
    </div>
  )
}

export { TagFooter }
