'use client'

import { useEffect, useState, ReactNode, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

interface CTACarouselProps {
  children: ReactNode[]
  className?: string
}

export function CTACarousel({ children, className = '' }: CTACarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      containScroll: false,
    },
    [Autoplay({ delay: 3000, stopOnInteraction: true })]
  )
  const [activeIndex, setActiveIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setActiveIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    
    emblaApi.on('select', onSelect)
    onSelect()
    
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollToIndex = (index: number) => {
    emblaApi?.scrollTo(index)
  }

  return (
    <div className={`cta-carousel-wrapper ${className}`}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {children.map((child, index) => (
            <div 
              key={index} 
              className="shrink-0 px-1"
              style={{ 
                flex: '0 0 93%',
                minWidth: 0,
                maxWidth: '395px'
              }}
              onClick={() => scrollToIndex(index)}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1 mt-3">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === index 
                ? 'bg-white' 
                : 'bg-white/40'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default CTACarousel
