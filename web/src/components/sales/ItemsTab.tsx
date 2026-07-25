'use client'

import { Plus, Search, X, Image as ImageIcon } from 'lucide-react'

interface ItemsTabProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void
  products: any[]
  getProductCartQuantity: (id: string) => number
  handleProductAddTapped: (prod: any) => void
  getGroupedProducts: () => Record<string, any[]>
  openDrawer: (config: any) => void
}

export function ItemsTab({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  products,
  getProductCartQuantity,
  handleProductAddTapped,
  getGroupedProducts,
  openDrawer,
}: ItemsTabProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Search Input Bar */}
      <div className="px-4 py-2 border-b border-[#F4F6F8]">
        <div className="flex items-center bg-[#F4F6F8] rounded-[12px] px-3 py-2 focus-within:ring-2 focus-within:ring-[#0085FF] focus-within:bg-white transition-all border border-transparent focus-within:border-[#0085FF]">
          <Search className="w-4 h-4 text-[#8E8E93] mr-2" />
          <input
            type="text"
            placeholder="Search products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none text-black"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-0.5 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5 text-[#8E8E93]" />
            </button>
          )}
        </div>
      </div>

      {/* Category horizontal filter tags */}
      {!searchQuery && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide shrink-0 select-none">
          {['All', 'Combos', 'Perfumes', 'Scents'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeCategory === cat
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#8E8E93] border-[#E9EBED] hover:text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search Query Results Subtitle */}
      {searchQuery && products.length > 0 && (
        <div className="px-4 py-2.5 text-left shrink-0 select-none">
          <span className="text-xs text-[#8E8E93] font-medium">
            {products.length === 1 ? '1 result' : `${products.length} results`}{' '}
            for &ldquo;{searchQuery}&rdquo;
          </span>
        </div>
      )}

      {/* Main content list / empty states */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 flex flex-col">
        {products.length === 0 ? (
          searchQuery ? (
            /* Search query empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 select-none">
              <img
                src="/images/search.png"
                alt="Search products"
                className="w-24 h-24 object-contain mb-5"
              />
              <h3 className="text-[17px] font-bold text-black mb-1.5">
                Search products
              </h3>
              <p className="text-xs text-[#8E8E93] font-medium max-w-60 leading-relaxed">
                Find products easily by searching with the name or any keyword
                of the product.
              </p>
            </div>
          ) : (
            /* Database products empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 select-none">
              <img
                src="/images/box.png"
                alt="No products"
                className="w-24 h-24 object-contain mb-5"
              />
              <h3 className="text-[17px] font-bold text-black mb-1.5">
                No products yet
              </h3>
              <p className="text-xs text-[#8E8E93] font-medium max-w-60 mb-6 leading-relaxed">
                Upload your products and start collecting payments for them with
                Firespot.
              </p>
              <button
                onClick={() => openDrawer({ type: 'obtain-kit' })}
                className="h-10 px-6 bg-black hover:bg-black/90 active:bg-black/85 text-white font-bold rounded-full text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                ADD PRODUCT
              </button>
            </div>
          )
        ) : (
          /* Products list */
          <div className="flex flex-col py-2">
            {searchQuery ? (
              /* Flat list for search results */
              <div className="flex flex-col gap-4">
                {products.map((prod: any) => {
                  const cartQty = getProductCartQuantity(prod._id)
                  return (
                    <div
                      key={prod._id}
                      className="flex items-center justify-between border-b border-[#F4F6F8] pb-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-[#F4F6F8] rounded-[10px] flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5" />
                          )}
                          {cartQty > 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-[13px]">
                              {cartQty}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col text-left justify-center">
                          <span className="text-sm font-bold text-black leading-tight">
                            {prod.name}
                          </span>
                          <span className="text-xs text-[#00000060] mt-0.5">
                            {prod.description || 'Premium item'}
                          </span>
                          <span className="text-sm font-bold text-black mt-1">
                            ₦{prod.price?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleProductAddTapped(prod)}
                        className="w-8 h-8 bg-[#F4F6F8] hover:bg-gray-200 active:bg-gray-300 rounded-xl flex items-center justify-center text-black font-bold transition-all"
                      >
                        <Plus className="w-4 h-4 stroke-[3px]" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Grouped category list for browsing */
              <div className="flex flex-col gap-6">
                {Object.entries(getGroupedProducts()).map(
                  ([categoryName, items]) => (
                    <div
                      key={categoryName}
                      className="flex flex-col gap-3 font-satoshi"
                    >
                      <h3 className="text-[14px] font-bold text-black text-left capitalize px-0.5 mt-2">
                        {categoryName}
                      </h3>
                      <div className="flex flex-col gap-4">
                        {items.map((prod: any) => {
                          const cartQty = getProductCartQuantity(prod._id)
                          return (
                            <div
                              key={prod._id}
                              className="flex items-center justify-between border-b border-[#F4F6F8] pb-3 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 bg-[#F4F6F8] rounded-[10px] flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                                  {prod.imageUrl ? (
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="w-5 h-5" />
                                  )}
                                  {cartQty > 0 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-[13px]">
                                      {cartQty}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col text-left justify-center">
                                  <span className="text-sm font-bold text-black leading-tight">
                                    {prod.name}
                                  </span>
                                  <span className="text-xs text-[#00000060] mt-0.5">
                                    {prod.description || 'Premium item'}
                                  </span>
                                  <span className="text-sm font-bold text-black mt-1">
                                    ₦{prod.price?.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleProductAddTapped(prod)}
                                className="w-8 h-8 bg-[#F4F6F8] hover:bg-gray-200 active:bg-gray-300 rounded-xl flex items-center justify-center text-black font-bold transition-all"
                              >
                                <Plus className="w-4 h-4 stroke-[3px]" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* End of list message */}
            {!searchQuery && (
              <div className="text-center py-6 select-none shrink-0 border-t border-[#F4F6F8] mt-6">
                <span className="text-xs text-[#8E8E93] font-medium">
                  You&rsquo;ve reached the end of the list
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
