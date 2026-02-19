import { api } from './client';

type LoginInput = {
  email: string;
  password: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId?: string;
};

type LoginResponse = {
  user: User;
  accessToken: string;
};

export const authApi = {
  login(data: LoginInput) {
    return api.post<LoginResponse>('/auth/login', data);
  }
};

