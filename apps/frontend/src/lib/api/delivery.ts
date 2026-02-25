import { api } from './client';

export type DeliveryPersonSummary = {
  id: string;
  name: string;
  phone: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  isAvailable: boolean;
};

export type DeliveryOrderRating = {
  id: string;
  rating: number;
  comment: string | null;
  punctuality: number | null;
  professionalism: number | null;
  createdAt: string;
};

export type DeliveryOrderStatus = {
  id: string;
  orderId: string;
  businessId: string;
  status: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  otpCode: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  rating: DeliveryOrderRating | null;
  deliveryPerson: {
    id: string;
    name: string;
    phone: string | null;
    averageRating?: number | null;
    ratingsCount?: number;
  } | null;
};

export const deliveryApi = {
  listPersons() {
    return api.get<{ persons: DeliveryPersonSummary[] }>('/delivery/persons');
  },
  getOrder(orderId: string) {
    return api.get<{ deliveryOrder: DeliveryOrderStatus }>(`/delivery/orders/${orderId}`);
  },
  assign(orderId: string, deliveryPersonId: string) {
    return api.post(`/delivery/orders/${orderId}/assign`, {
      deliveryPersonId
    });
  },
  confirmOtp(orderId: string, otpCode: string) {
    return api.post(`/delivery/orders/${orderId}/confirm-otp`, {
      otpCode
    });
  }
};
