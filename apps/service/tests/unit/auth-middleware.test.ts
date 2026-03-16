import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

import { supabaseAuth } from '../../src/middlewares/auth';
import { supabaseAdmin } from '../../src/lib/supabase';

describe('supabaseAuth middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  const mockGetUser = vi.mocked(supabaseAdmin.auth.getUser);

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    mockGetUser.mockReset();
  });

  it('should return 401 when no authorization header', async () => {
    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Missing authorization header' })
    );
  });

  it('should return 401 when authorization header does not start with Bearer', async () => {
    mockReq.headers.authorization = 'Basic abc123';
    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Missing authorization header' })
    );
  });

  it('should return 401 when supabase returns error', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    } as any);

    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid or expired token' })
    );
  });

  it('should return 401 when supabase returns no user', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as any);

    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid or expired token' })
    );
  });

  it('should attach userId and userEmail to request on success', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
      },
      error: null,
    } as any);

    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockReq.userId).toBe('user-123');
    expect(mockReq.userEmail).toBe('test@example.com');
  });

  it('should call next() on success', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
      },
      error: null,
    } as any);

    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 401 on supabase exception', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockRejectedValueOnce(new Error('Connection failed'));

    await supabaseAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Authentication failed' })
    );
  });
});
