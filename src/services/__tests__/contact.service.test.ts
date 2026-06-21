import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitContactMessage } from '../contact.service';

vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../api';

const mockPost = vi.mocked(apiClient.post);

describe('submitContactMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the contact message to the public contact endpoint', async () => {
    mockPost.mockResolvedValueOnce({
      success: true,
      message_id: 'msg-1',
      message: 'Message received',
    });

    const payload = {
      name: 'Jane Producer',
      email: 'jane@example.com',
      company: 'Acme Films',
      category: 'sales' as const,
      subject: 'Enterprise demo',
      message: "We'd like to discuss enterprise intelligence access.",
      page_url: 'http://localhost:5173/b2b',
    };

    const result = await submitContactMessage(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/contact', payload);
    expect(result.message_id).toBe('msg-1');
  });
});
