import { apiClient } from './api';

export type SupportInquiryCategory =
  | 'general'
  | 'account'
  | 'billing'
  | 'technical'
  | 'report'
  | 'complaint';

export interface SupportInquiryPayload {
  category: SupportInquiryCategory;
  message: string;
  selected_faq_question?: string;
  selected_faq_answer?: string;
  page_url?: string;
}

export interface SupportInquiryResponse {
  success: boolean;
  inquiry_id: string;
  message: string;
}

export async function submitSupportInquiry(
  payload: SupportInquiryPayload,
): Promise<SupportInquiryResponse> {
  return apiClient.post<SupportInquiryResponse>('/api/support/contact', payload, { auth: true });
}
