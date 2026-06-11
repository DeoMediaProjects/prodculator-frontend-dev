import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitSupportInquiry } from '../support.service';

vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../api';

const mockPost = vi.mocked(apiClient.post);

describe('submitSupportInquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts support inquiries to the authenticated support endpoint', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      inquiry_id: 'inq-1',
      message: 'Support inquiry received',
    });

    const payload = {
      category: 'technical' as const,
      message: 'I need help with a dashboard issue.',
      selected_faq_question: 'Is my script safe? Do you store it?',
      selected_faq_answer: 'Your script is deleted after metadata extraction.',
      page_url: 'http://localhost:5173/dashboard',
    };

    const result = await submitSupportInquiry(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/support/contact', payload, { auth: true });
    expect(result.inquiry_id).toBe('inq-1');
  });
});
