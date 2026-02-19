import { api } from './client';
import { getAccessToken } from '../auth/storage';

export type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export type ConversationCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
};

export type Conversation = {
  id: string;
  channel: string;
  status: string;
  botActive?: boolean;
  updatedAt: string;
  customer?: ConversationCustomer | null;
  messages?: Message[];
  _count?: {
    messages: number;
  };
};

export type ConversationsResponse = {
  data: Conversation[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

const authHeaders = () => {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
};

export const chatApi = {
  list(params?: { page?: number; limit?: number }) {
    return api.get<ConversationsResponse>('/conversations', {
      params,
      headers: authHeaders()
    });
  },
  getMessages(conversationId: string, params?: { page?: number; limit?: number }) {
    return api.get<{ data: Message[] }>(`/conversations/${conversationId}/messages`, {
      params,
      headers: authHeaders()
    });
  },
  sendMessage(conversationId: string, content: string) {
    return api.post<Message>(
      `/conversations/${conversationId}/messages`,
      { content },
      {
        headers: authHeaders()
      }
    );
  },
  toggleBot(conversationId: string) {
    return api.patch<Conversation>(`/conversations/${conversationId}/bot`, undefined, {
      headers: authHeaders()
    });
  }
};
