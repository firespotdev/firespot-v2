const LoaderCircle = ({
  innerBg,
  size = 10,
}: {
  innerBg?: string
  size?: number
}) => {
  return (
    <div className="flex items-center justify-center min-h-full w-full">
      <div className={`relative w-${size} h-${size} animate-loader`}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(103, 206, 103, 0.1) 0%, #67ce67 300deg, rgba(103, 206, 103, 0) 270deg)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[75%] rounded-full"
          style={{ background: innerBg || 'white' }}
        />
      </div>
    </div>
  )
}

export { LoaderCircle }
