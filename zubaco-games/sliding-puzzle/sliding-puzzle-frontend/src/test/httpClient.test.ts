import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import '../services/httpClient';

jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    create: jest.fn(() => mockInstance),
    isAxiosError: jest.fn(
      (err: unknown): err is { isAxiosError: boolean; response?: { status: number } } =>
        Boolean(
          err &&
          typeof err === 'object' &&
          'isAxiosError' in err &&
          (err as { isAxiosError: boolean }).isAxiosError,
        ),
    ),
  };
});

describe('httpClient', () => {
  const mockInstance = axios.create();
  const mockAxiosInstance = jest.mocked(mockInstance);

  beforeEach(() => {
    // We don't clear mocks here because interceptors are registered once at module load
  });

  it('handles 401 error and token cleanup', async () => {
    const responseInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][1];
    if (!responseInterceptorErr) throw new Error('Interceptor not found');

    const error = { isAxiosError: true, response: { status: 401 } };

    localStorage.setItem('auth_token', 'old-token');

    await expect(responseInterceptorErr(error)).rejects.toThrow('[object Object]');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('handles non-Error object in response interceptor', async () => {
    const responseInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][1];
    if (!responseInterceptorErr) throw new Error('Interceptor not found');

    try {
      await responseInterceptorErr('simple string error');
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe('simple string error');
    }
  });

  it('handles non-401 axios error', async () => {
    const responseInterceptor = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][0];
    const responseInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][1];
    if (!responseInterceptorErr || !responseInterceptor) throw new Error('Interceptor not found');

    const error = { isAxiosError: true, response: { status: 500 } };
    const resp = { data: 1 };

    expect(responseInterceptor(resp as unknown as AxiosResponse)).toBe(resp);
    await expect(responseInterceptorErr(error)).rejects.toThrow('[object Object]');
  });

  it('handles non-Error object in request interceptor', async () => {
    const requestInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.request.use).mock
      .calls[0][1];
    if (!requestInterceptorErr) throw new Error('Interceptor not found');

    try {
      await requestInterceptorErr('string request error');
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe('string request error');
    }
  });

  it('handles non-axios error', async () => {
    const responseInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][1];
    if (!responseInterceptorErr) throw new Error('Interceptor not found');

    const error = new Error('Generic');
    await expect(responseInterceptorErr(error)).rejects.toThrow('Generic');
  });

  it('handles request interceptor with token', () => {
    const requestInterceptor = jest.mocked(mockAxiosInstance.interceptors.request.use).mock
      .calls[0][0];
    if (!requestInterceptor) throw new Error('Interceptor not found');

    localStorage.setItem('auth_token', 'm-token');
    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;

    expect(requestInterceptor(config)).toEqual(config);
    localStorage.clear();
  });

  it('handles request interceptor error', async () => {
    const requestInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.request.use).mock
      .calls[0][1];
    if (!requestInterceptorErr) throw new Error('Interceptor not found');

    const error = new Error('Request Fail');
    await expect(requestInterceptorErr(error)).rejects.toThrow('Request Fail');
  });
});
