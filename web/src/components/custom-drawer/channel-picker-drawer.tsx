"use client";

import { useState } from "react";
import {
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
  icon: React.ComponentType<{ className?: string }>;
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
    <div className="flex flex-col h-full bg-white font-satoshi">
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="divide-y divide-[#F1F5F9]">
          {displayedChannels.map((item) => {
            const Icon = item.icon;
            const isSelected = currentChannel === item.id;

            return (
              <label
                key={item.id}
                onClick={() => setCurrentChannel(item.id)}
                className="flex items-center justify-between py-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#0F172A] shrink-0">
                    <Icon className="w-5 h-5 text-[#0F172A]" />
                  </div>
                  <span className="font-semibold text-base text-[#0F172A]">
                    {item.label}
                  </span>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-[#047857] bg-[#047857]"
                      : "border-[#CBD5E1] group-hover:border-[#94A3B8]"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-[#E2E8F0] bg-white">
        <Button
          type="button"
          onClick={handleMakePayment}
          className="w-full bg-[#047857] hover:bg-[#065F46] text-white font-bold text-base py-3.5 rounded-xl transition-colors"
        >
          Make Payment
        </Button>
      </div>
    </div>
  );
}
