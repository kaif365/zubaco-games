import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

describe('httpClient wrappers', () => {
  const mockAxiosInstance = {
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

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let client: typeof import('../services/httpClient');

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock('axios', () => ({
      create: jest.fn(() => mockAxiosInstance),
      isAxiosError: jest.fn((err: unknown): err is { isAxiosError: boolean } =>
        Boolean(
          err &&
          typeof err === 'object' &&
          'isAxiosError' in err &&
          (err as { isAxiosError: boolean }).isAxiosError,
        ),
      ),
    }));

    await jest.isolateModulesAsync(async () => {
      client = await import('../services/httpClient');
    });
  });

  it('covers all wrapper methods', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: 'get' });
    mockAxiosInstance.post.mockResolvedValue({ data: 'post' });
    mockAxiosInstance.put.mockResolvedValue({ data: 'put' });
    mockAxiosInstance.patch.mockResolvedValue({ data: 'patch' });
    mockAxiosInstance.delete.mockResolvedValue({ data: 'delete' });

    expect(await client.get('/t')).toBe('get');
    expect(await client.post('/t', {})).toBe('post');
    expect(await client.put('/t', {})).toBe('put');
    expect(await client.patch('/t', {})).toBe('patch');
    expect(await client.del('/t')).toBe('delete');
  });

  it('covers interceptor edge cases', async () => {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const requestInterceptor = jest.mocked(mockAxiosInstance.interceptors.request.use).mock
      .calls[0][0];
    const requestInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.request.use).mock
      .calls[0][1];
    const responseInterceptor = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][0];
    const responseInterceptorErr = jest.mocked(mockAxiosInstance.interceptors.response.use).mock
      .calls[0][1];
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    if (
      !requestInterceptor ||
      !requestInterceptorErr ||
      !responseInterceptor ||
      !responseInterceptorErr
    ) {
      throw new Error('Interceptors not found');
    }

    // Request succ
    localStorage.clear();
    const config = { headers: {} } as InternalAxiosRequestConfig;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(requestInterceptor(config)).toEqual(config);

    // Request err
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await expect(requestInterceptorErr(new Error('fail'))).rejects.toThrow('fail');

    // Response succ
    const resp = { data: 1 };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(responseInterceptor(resp as unknown as AxiosResponse)).toBe(resp);

    // Response err non-axios
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await expect(responseInterceptorErr(new Error('fail'))).rejects.toThrow('fail');
  });
});
