import { apiClient } from './api';

export type ContactInquiryCategory =
  | 'general'
  | 'sales'
  | 'partnership'
  | 'support'
  | 'billing';

export interface ContactMessagePayload {
  name: string;
  email: string;
  company?: string;
  category: ContactInquiryCategory;
  subject: string;
  message: string;
  page_url?: string;
}

export interface ContactMessageResponse {
  success: boolean;
  message_id: string;
  message: string;
}

/**
 * Submits the public contact form. This endpoint requires no authentication —
 * it is reachable by prospects and logged-out visitors.
 */
export async function submitContactMessage(
  payload: ContactMessagePayload,
): Promise<ContactMessageResponse> {
  return apiClient.post<ContactMessageResponse>('/api/contact', payload);
}
