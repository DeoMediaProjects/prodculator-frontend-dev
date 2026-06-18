import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { adminB2BService, b2bService, type B2BIntelligenceRequest } from '../b2b.service';

vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  apiFetch: vi.fn(),
}));

import { apiClient, apiFetch } from '../api';

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockApiFetch = vi.mocked(apiFetch);

describe('b2bService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts B2B checkout through the dedicated B2B endpoint', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_b2b', url: 'https://checkout.stripe.test/b2b' });

    const result = await b2bService.createCheckout({
      product_type: 'camera_equipment',
      currency: 'gbp',
      delivery_frequency: 'monthly',
      extra_recipient_email: 'ops@example.com',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/b2b/checkout',
      {
        product_type: 'camera_equipment',
        currency: 'gbp',
        delivery_frequency: 'monthly',
        extra_recipient_email: 'ops@example.com',
      },
      { auth: true }
    );
    expect(result.session_id).toBe('cs_b2b');
  });

  it('unwraps B2B subscriptions from the API list envelope', async () => {
    mockGet.mockResolvedValueOnce({
      items: [
        {
          id: 'sub-1',
          product_type: 'crew_casting',
          status: 'active',
        },
      ],
    });

    const result = await b2bService.getSubscriptions();

    expect(mockGet).toHaveBeenCalledWith('/api/b2b/subscriptions', { auth: true });
    expect(result).toHaveLength(1);
    expect(result[0].product_type).toBe('crew_casting');
  });

  it('downloads customer PDFs through the authenticated B2B PDF endpoint', async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { href: '', download: '', click, remove } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:pdf'),
      revokeObjectURL: vi.fn(),
    });
    mockApiFetch.mockResolvedValueOnce(new Response(new Blob(['pdf'], { type: 'application/pdf' }), { status: 200 }));

    await b2bService.downloadRequestPdf({
      id: 'req-1',
      product_type: 'camera_equipment',
    } as B2BIntelligenceRequest);

    expect(mockApiFetch).toHaveBeenCalledWith('/api/b2b/requests/req-1/pdf');
    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('B2B Intelligence - camera_equipment.pdf');
  });
});

describe('adminB2BService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates B2B subscription settings through the admin endpoint', async () => {
    mockPatch.mockResolvedValueOnce({ id: 'sub-1', delivery_frequency: 'quarterly' });

    await adminB2BService.updateSubscription('sub-1', {
      delivery_frequency: 'quarterly',
      extra_recipient_email: 'ops@example.com',
    });

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/admin/b2b/subscriptions/sub-1',
      {
        delivery_frequency: 'quarterly',
        extra_recipient_email: 'ops@example.com',
      },
      { auth: true }
    );
  });

  it('creates manual enterprise contracts through the admin endpoint', async () => {
    mockPost.mockResolvedValueOnce({ id: 'sub-manual-1' });

    await adminB2BService.createManualSubscription({
      user_email: 'buyer@example.com',
      product_type: 'enterprise',
      delivery_frequency: 'quarterly',
      status: 'active',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/b2b/subscriptions',
      {
        user_email: 'buyer@example.com',
        product_type: 'enterprise',
        delivery_frequency: 'quarterly',
        status: 'active',
      },
      { auth: true }
    );
  });
});
