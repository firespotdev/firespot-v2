const TransactionDetailsDrawer = () => {
  return (
    <>
      <div className="p-3 text-black border-b border-[#f1f1f1] w-full text-center flex justify-between items-center">
        <div className="w-6 h-4"></div>
        <h2 className="text-base font-bold">Transaction details</h2>
        <X size={20} className="cursor-pointer" onClick={onClose} />
      </div>

      <div className="flex flex-col items-center p-8">
        {/* Status Icon */}
        <div className="mb-4">
          {isSuccess && (
            <CircleCheck
              size={76}
              strokeWidth={1.2}
              className="text-[#24C166]"
            />
          )}
          {(isPending || isPaymentInProgress) && (
            <div className="w-[76px] h-[76px] flex items-center justify-center">
              <Ring size={76} />
            </div>
          )}
          {isExpired && (
            <div className="w-[76px] h-[76px] rounded-full bg-[#9CA3AF] flex items-center justify-center">
              <Clock size={36} strokeWidth={2} className="text-white" />
            </div>
          )}
          {isFailed ||
            (isReversed && (
              <div className="w-[76px] h-[76px] rounded-full bg-[#EF4444] flex items-center justify-center">
                <div className="text-white text-[48px] font-bold leading-none">
                  !
                </div>
              </div>
            ))}
        </div>

        {/* Amount and Status Message */}
        <div className="mb-6 text-center">
          <h3 className="mb-1 text-[20px] font-bold text-black -tracking-[0.4px] leading-[100%]">
            {isSuccess && '+ '}NGN {formatNumber(transaction?.amount ?? 0)}
          </h3>
          {isSuccess && (
            <p className="text-[14px] text-[#898A8D] font-medium">
              Payment successful
            </p>
          )}
          {isPending ||
            (isPaymentInProgress && (
              <div className="text-[14px] text-[#898A8D] font-medium max-w-[320px]">
                <p>Waiting for customer to complete payment.</p>
                <p>Link valid for 5 minutes.</p>
              </div>
            ))}
          {isExpired && (
            <div className="text-[14px] text-[#898A8D] font-medium max-w-[340px]">
              <p>
                QR code expired after 5 minutes. Customer didn't complete
                payment in time.
              </p>
            </div>
          )}
          {isFailed && (
            <p className="text-[14px] text-[#898A8D] font-medium">
              This payment attempt failed
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {isSuccess && (
          <div className="flex gap-3 mb-6">
            <Button
              variant="outline"
              className="rounded-full bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB]"
              onClick={handleShareReceipt}
            >
              <Share size={14} />
              SHARE RECEIPT
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB]"
              onClick={handleShareReceipt}
            >
              <Download size={14} />
              DOWNLOAD RECEIPT
            </Button>
          </div>
        )}
        {(isPending || isPaymentInProgress) && (
          <div className="flex gap-3 mb-6">
            <Button
              variant="outline"
              className="rounded-full bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB] h-9"
              onClick={() => {
                setQrTransactionId(transaction.id)
                setQrModalOpened(true)
              }}
            >
              <QrCode size={14} className="mr-1" />
              SHOW QR
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB] h-9"
              onClick={handleCopyLink}
            >
              <LinkIcon size={14} className="mr-1" />
              COPY LINK
            </Button>
          </div>
        )}
        {isExpired && (
          <Button
            variant="outline"
            className="mb-6 rounded-full bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB]"
            onClick={handleRequestPaymentAgain}
            disabled={isInitiating}
          >
            {isInitiating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            REQUEST PAYMENT AGAIN
          </Button>
        )}
        {isFailed && (
          <Button
            variant="outline"
            className="mb-6 rounded-full bg-[#F1F1F1] border-transparent px-4 py-[10px] text-[10px] font-bold text-black tracking-[1px] hover:bg-[#E5E7EB]"
            onClick={handleTryAgain}
            disabled={isInitiating}
          >
            {isInitiating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            TRY AGAIN
          </Button>
        )}

        {/* Status Breakdown Section with Border */}
        {(isPending || isPaymentInProgress) && (
          <div className="w-full border border-[#F1F1F1] rounded-2xl bg-white p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Status
              </span>
              <div className="flex items-center gap-1 text-[#D97706]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="animate-pulse"
                >
                  <path
                    d="M8 2V4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.2426 3.75736L10.8284 5.17157"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 8H12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.2426 12.2426L10.8284 10.8284"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 14V12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.75736 12.2426L5.17157 10.8284"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 8H4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.75736 3.75736L5.17157 5.17157"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-[14px] font-medium">
                  {isPaymentInProgress ? 'Payment in progress' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Expires In */}
            {timeLeft && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Expires in
                </span>
                <span className="text-[14px] font-medium text-black">
                  {timeLeft}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Details Section with Border */}
        {(isSuccess || isExpired || isFailed) && (
          <div className="w-full border border-[#F1F1F1] rounded-2xl bg-white p-5 space-y-4">
            {isSuccess && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Status
                </span>
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="8" r="8" fill="#24C166" />
                    <path
                      d="M5 8.5L7 10.5L11 6.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[14px] font-medium text-black">
                    Paid
                  </span>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Status
                </span>
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="8" r="8" fill="#D97706" />
                    <path
                      d="M8 4v4l2 2"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[14px] font-medium text-black">
                    Expired
                  </span>
                </div>
              </div>
            )}
            {isFailed && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Status
                </span>
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="8" r="8" fill="#EF4444" />
                    <path
                      d="M6 6l4 4m0-4l-4 4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[14px] font-medium text-black">
                    Failed
                  </span>
                </div>
              </div>
            )}

            {/* Reason (Expired/Failed only) */}
            {(isExpired || isFailed) && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Reason
                </span>
                <span className="text-[14px] font-medium text-black">
                  {transaction?.reason || 'Session timeout'}
                </span>
              </div>
            )}

            {/* Processing Time (Success only) */}
            {isSuccess && (
              <div className="flex justify-between items-center border-b border-[#F1F1F1] pb-4">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Processing time
                </span>
                <span className="text-[14px] font-medium text-black">
                  {transaction?.processingTime ?? '—'}
                </span>
              </div>
            )}

            {/* Amount (Success only) */}
            {isSuccess && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Amount
                </span>
                <span className="text-[14px] font-medium text-black">
                  NGN {formatNumber(transaction?.amount ?? 0)}
                </span>
              </div>
            )}

            {/* Amount (Expired/Failed) */}
            {(isExpired || isFailed) && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Amount
                </span>
                <span className="text-[14px] font-medium text-black">
                  NGN {formatNumber(transaction?.amount ?? 0)}
                </span>
              </div>
            )}

            {/* Fees (Success only) */}
            {isSuccess && transaction?.fees !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Fees
                </span>
                <span className="text-[14px] font-medium text-black">
                  NGN {formatNumber(transaction.fees)}
                </span>
              </div>
            )}

            {/* Net Received (Success only) */}
            {isSuccess && transaction?.netReceived !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-[#00000080] font-normal">
                  Net received
                </span>
                <span className="text-[14px] font-medium text-black">
                  NGN {formatNumber(transaction.netReceived)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Second Details Section with Border */}
        <div className="w-full border border-[#F1F1F1] rounded-2xl bg-white p-5 space-y-4 mt-4">
          {/* Customer (Success only) */}
          {isSuccess && transaction?.customer && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Customer
              </span>
              <span className="text-[14px] font-medium text-black">
                {transaction.customer}
              </span>
            </div>
          )}

          {/* Description */}
          <div className="flex justify-between items-center">
            <span className="text-[14px] text-[#00000080] font-normal">
              Description
            </span>
            <span
              onClick={() => handleViewProducts(transaction?.products || [])}
              className={`text-[14px] font-medium text-black flex items-center gap-1 ${
                transaction?.products?.length > 0 ? 'cursor-pointer' : ''
              }`}
            >
              {transaction?.products?.length > 0
                ? `${transaction.products.length} items`
                : transaction?.description || 'Amount payment'}
              {transaction?.products?.length > 0 && <ChevronRight size={14} />}
            </span>
          </div>

          {/* Date and time */}
          <div className="flex justify-between items-center">
            <span className="text-[14px] text-[#00000080] font-normal">
              Date and time
            </span>
            <span className="text-[14px] font-medium text-black">
              {formatPaidOn(transaction?.paidOn)}
            </span>
          </div>

          {/* Location */}
          {transaction?.branch && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Location
              </span>
              <span className="text-[14px] font-medium text-black">
                {transaction.branch}
              </span>
            </div>
          )}

          {/* Payment method (Success only) */}
          {isSuccess && transaction?.paymentMethod && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Payment method
              </span>
              <span className="text-[14px] font-medium text-black">
                {transaction.paymentMethod}
              </span>
            </div>
          )}

          {/* Reference */}
          {transaction?.reference && (
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-[#00000080] font-normal">
                Reference
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-black">
                  {formatReferenceNumber(transaction.reference)}
                </span>
                <Copy
                  size={16}
                  className="cursor-pointer text-[#9CA3AF] hover:text-black"
                  onClick={() => {
                    navigator.clipboard.writeText(transaction.reference)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export { TransactionDetailsDrawer }
