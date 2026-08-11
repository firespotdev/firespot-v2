"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Landmark,
  Building2,
  Smartphone,
  QrCode,
  Apple,
} from "lucide-react";
import { useDrawerStore } from "@/services/drawer";
import { Button } from "@/components/ui/button";

export interface PaystackChannelOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const PAYSTACK_CHANNEL_REGISTRY: PaystackChannelOption[] = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank_transfer", label: "Bank Transfer", icon: Landmark },
  { id: "bank", label: "Bank", icon: Building2 },
  { id: "ussd", label: "USSD", icon: Smartphone },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "apple_pay", label: "Apple Pay", icon: Apple },
];

const DEFAULT_CHANNELS = ["card", "bank_transfer", "bank", "ussd", "qr"];
const requestedChannels =
  process.env.NEXT_PUBLIC_PAYSTACK_COLLECTION_CHANNELS?.split(",")
    .map((channel) => channel.trim())
    .filter(Boolean) || [];
const recognizedChannels = requestedChannels.filter((requested) =>
  PAYSTACK_CHANNEL_REGISTRY.some((channel) => channel.id === requested),
);
const configuredChannels = recognizedChannels.length
  ? recognizedChannels
  : DEFAULT_CHANNELS;
const PAYSTACK_CHANNELS = PAYSTACK_CHANNEL_REGISTRY.filter((channel) =>
  configuredChannels.includes(channel.id),
);
export const DEFAULT_PAYSTACK_CHANNEL = PAYSTACK_CHANNELS[0]?.id || "card";

interface ChannelPickerDrawerProps {
  selectedChannel?: string;
  availableChannels?: string[];
  onSelectChannel: (channelId: string) => void;
}

export function ChannelPickerDrawer({
  selectedChannel = DEFAULT_PAYSTACK_CHANNEL,
  availableChannels,
  onSelectChannel,
}: ChannelPickerDrawerProps) {
  const [currentChannel, setCurrentChannel] = useState(selectedChannel);
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);
  const displayedChannels = availableChannels?.length
    ? PAYSTACK_CHANNEL_REGISTRY.filter((channel) =>
        availableChannels.includes(channel.id),
      )
    : PAYSTACK_CHANNELS;

  const handleMakePayment = () => {
    onSelectChannel(currentChannel);
    closeDrawer("channel-picker");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white font-satoshi">
      <header className="flex h-16 shrink-0 items-center border-b border-[#E7E9EC] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={() => closeDrawer("channel-picker")}
          aria-label="Back to payment screen"
          className="flex size-11 items-center justify-center rounded-[12px] text-black transition-colors hover:bg-[#F4F6F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]"
        >
          <ArrowLeft className="size-7" strokeWidth={2} />
        </button>
      </header>

      <div className="shrink-0 bg-[#F7F7F7] px-6 py-5">
        <h2 className="text-[20px] font-bold leading-7 tracking-[-0.02em] text-black">
          How would you like to pay?
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="divide-y divide-[#E7E9EC]">
          {displayedChannels.map((item) => {
            const Icon = item.icon;
            const isSelected = currentChannel === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setCurrentChannel(item.id)}
                aria-pressed={isSelected}
                className="group flex min-h-20 w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[#FAFAFA] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#047857]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center text-[#07966B]">
                    <Icon className="size-6" strokeWidth={2} />
                  </div>
                  <span className="truncate text-base font-medium text-black">
                    {item.label}
                  </span>
                </div>

                <div
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? "border-[#0AA879]"
                      : "border-[#111111] group-hover:border-[#07966B]"
                  }`}
                >
                  {isSelected && (
                    <div className="size-3 rounded-full bg-[#0AA879]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#E7E9EC] bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          onClick={handleMakePayment}
          className="min-h-14 w-full rounded-[12px] bg-[#075D4B] text-base font-bold text-white transition-colors hover:bg-[#064D3F] focus-visible:ring-[#075D4B]"
        >
          Make Payment
        </Button>
      </div>
    </div>
  );
}
