import { QRKit } from '../qr/interface';

export interface Order {
  _id: string;
  merchantId: {
    _id: string;
    businessName: string;
    fullPhoneNumber: string;
    merchantSlug: string;
  };
  quantity: number;
  phoneNumber: string;
  state: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  assignedKitIds: QRKit[];
  paystackReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  orderStatus?: string;
  paymentStatus?: string;
}
