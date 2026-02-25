import { api } from './client';

export type AuthCustomerRegisterInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessId: string;
};

export type AuthCustomerLoginInput = {
  email: string;
  password: string;
  businessId: string;
};

export type AuthCustomerProfile = {
  id: string;
  type: string;
  businessId: string;
  isBlocked: boolean;
};

export type AuthCustomer = {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type AuthCustomerRegisterResponse = {
  customer: AuthCustomer;
  profile: AuthCustomerProfile;
  accessToken: string;
};

export type AuthCustomerLoginResponse = AuthCustomerRegisterResponse;

export const authCustomerApi = {
  register(data: AuthCustomerRegisterInput) {
    return api.post<AuthCustomerRegisterResponse>('/auth/customer/register', data);
  },
  login(data: AuthCustomerLoginInput) {
    return api.post<AuthCustomerLoginResponse>('/auth/customer/login', data);
  }
};

