import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler';

describe('errorHandler middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should return error status from err.status', () => {
    const err = { status: 400, message: 'Bad Request' };
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should return error status from err.statusCode', () => {
    const err = { statusCode: 422, message: 'Unprocessable' };
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(422);
  });

  it('should default to 500 when no status is provided', () => {
    const err = { message: 'Something broke' };
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should return error message', () => {
    const err = { status: 400, message: 'Bad Request' };
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Bad Request' })
    );
  });

  it('should default message to "Internal server error"', () => {
    const err = {};
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' })
    );
  });

  it('should include stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const err = { message: 'Oops', stack: 'Error: Oops\n    at foo.ts:1:1' };
    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ stack: err.stack })
    );
  });

  it('should NOT include stack trace in production mode', () => {
    process.env.NODE_ENV = 'production';
    const err = { message: 'Oops', stack: 'Error: Oops\n    at foo.ts:1:1' };
    errorHandler(err, mockReq, mockRes, mockNext);

    const jsonArg = mockRes.json.mock.calls[0][0];
    expect(jsonArg).not.toHaveProperty('stack');
  });
});
