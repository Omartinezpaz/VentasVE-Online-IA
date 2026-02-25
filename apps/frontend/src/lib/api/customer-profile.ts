import { api } from './client';
import { getCustomerAccessToken } from '../auth/customer-storage';

export type CustomerProfile = {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  idType: string | null;
  idNumber: string | null;
  preferences: unknown;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerProfileResponse = {
  data: CustomerProfile;
};

const authHeaders = () => {
  const token = getCustomerAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const customerProfileApi = {
  getMine() {
    return api.get<CustomerProfileResponse>('/customers/me/profile', {
      headers: authHeaders()
    });
  },
  updateMine(data: Partial<Pick<CustomerProfile, 'firstName' | 'lastName' | 'dateOfBirth' | 'gender' | 'idType' | 'idNumber' | 'preferences' | 'avatar' | 'bio'>>) {
    return api.patch<CustomerProfileResponse>('/customers/me/profile', data, {
      headers: authHeaders()
    });
  }
};

