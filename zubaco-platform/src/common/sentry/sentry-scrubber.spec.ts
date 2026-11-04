import { SentryService } from './sentry.service';
import { SentryExceptionFilter } from './sentry-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('Sentry APM & Sensitive Data Scrubbing (Module 9.3)', () => {
  let sentryService: SentryService;
  let filter: SentryExceptionFilter;

  beforeEach(() => {
    sentryService = new SentryService();
    filter = new SentryExceptionFilter(sentryService);
  });

  describe('Sensitive PII & Financial Token Scrubbing', () => {
    it('redacts passwords, tokens, OTPs, PAN, and bank details from payload', () => {
      const sensitivePayload = {
        userId: 'u_123',
        password: 'mySuperSecretPassword123!',
        token: 'jwt.token.here',
        otp: '849201',
        bankAccount: '991029384756',
        ifscCode: 'HDFC0001234',
        pan: 'ABCDE1234F',
        nested: {
          refreshToken: 'refresh.secret.key',
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      };

      const sanitized = sentryService.sanitizePayload(sensitivePayload);

      expect(sanitized.userId).toBe('u_123');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.otp).toBe('[REDACTED]');
      expect(sanitized.bankAccount).toBe('[REDACTED]');
      expect(sanitized.ifscCode).toBe('[REDACTED]');
      expect(sanitized.pan).toBe('[REDACTED]');
      expect(sanitized.nested.refreshToken).toBe('[REDACTED]');
      expect(sanitized.nested.authorization).toBe('[REDACTED]');
    });

    it('redacts Bearer authorization header values', () => {
      const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer secret_user_token_999',
      };

      const sanitized = sentryService.sanitizePayload(headers);
      expect(sanitized.authorization).toBe('[REDACTED]');
    });

    it('safely handles non-object, null, and array payloads', () => {
      expect(sentryService.sanitizePayload(null)).toBeNull();
      expect(sentryService.sanitizePayload('test')).toBe('test');
      expect(sentryService.sanitizePayload(1234)).toBe(1234);

      const arr = [{ password: '123' }, { userId: 'u1' }];
      const sanitizedArr = sentryService.sanitizePayload(arr);
      expect(sanitizedArr[0].password).toBe('[REDACTED]');
      expect(sanitizedArr[1].userId).toBe('u1');
    });
  });

  describe('SentryExceptionFilter Error Interception', () => {
    let mockResponse: any;
    let mockRequest: any;
    let mockArgumentsHost: any;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockRequest = {
        url: '/api/v1/tournaments/join',
        method: 'POST',
        headers: { authorization: 'Bearer secret_jwt' },
        body: { password: 'secret_password' },
      };
      mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };
    });

    it('captures 500 internal server errors, generates errorId, and masks internal error details', () => {
      const internalError = new Error('Database connection terminated abruptly');

      filter.catch(internalError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          errorId: expect.stringMatching(/^sentry_/),
        }),
      );
    });

    it('passes through 4xx client errors without reporting as critical 500 internal errors', () => {
      const clientError = new HttpException('Invalid tournament ID', HttpStatus.BAD_REQUEST);

      filter.catch(clientError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid tournament ID',
        }),
      );
    });
  });
});
