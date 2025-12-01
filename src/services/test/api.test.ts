import { beforeEach, expect, test, vi } from 'vitest'

let requestFulfilled: any = undefined
let responseRejected: any = undefined
let axiosInstance: any = undefined

// simple in-memory localStorage mock factory
function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key: string, value: string) {
      store[key] = String(value)
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    },
  }
}

beforeEach(async () => {
  // reset environment so module re-import will recreate apiService with our mocked axios
  vi.resetModules()

  // ensure a global localStorage exists for tests (reset each run)
  // @ts-ignore
  globalThis.localStorage = createLocalStorageMock()
  // ensure a global window object exists so tests can manipulate window.location
  // @ts-ignore
  if (!globalThis.window) globalThis.window = { location: { href: '' } }

  // local mock axios instance where interceptors.register will capture the handlers
  requestFulfilled = undefined
  responseRejected = undefined
  axiosInstance = {
    interceptors: {
      request: {
        use: (fulfilled: any, _rejected: any) => {
          requestFulfilled = fulfilled
          return 0
        },
      },
      response: {
        use: (_fulfilled: any, rejected: any) => {
          responseRejected = rejected
          return 0
        },
      },
    },
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }

  // Mock axios module so ApiService constructor uses our axiosInstance
  vi.mock('axios', () => {
    const isAxiosError = (e: any) => Boolean(e && e.isAxiosError)
    return {
      default: {
        create: () => axiosInstance,
        // export isAxiosError on the default export since api.ts calls axios.isAxiosError(...)
        isAxiosError,
      },
      // also provide named export just in case
      isAxiosError,
    }
  })

  // import the module under test after mocking axios
  await import('../api') // populates the singleton instance inside module
})

test('request interceptor sets Authorization header from localStorage', async () => {
  localStorage.setItem('authToken', 'test-token-123')
  // ensure interceptor was registered
  expect(typeof requestFulfilled).toBe('function')
  const cfg = { headers: {} }
  const out = await requestFulfilled(cfg)
  expect(out.headers.Authorization).toBe('Bearer test-token-123')
  localStorage.removeItem('authToken')
})

test('response interceptor clears localStorage and redirects on 401', async () => {
  // prepare storage and a writable location object
  localStorage.setItem('authToken', 'x')
  localStorage.setItem('user', JSON.stringify({ id: 'u1' }))

  // make window.location writable in jsdom
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete window.location
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.location = { href: '' }

  expect(typeof responseRejected).toBe('function')

  // simulate axios error with 401
  const err = { response: { status: 401 } }
  // call interceptor and swallow rejection
  await responseRejected(err).catch(() => {})

  expect(localStorage.getItem('authToken')).toBeNull()
  expect(localStorage.getItem('user')).toBeNull()
  expect((window as any).location.href).toBe('/login')
})

test('login stores token and user when backend returns wrapped { data: { token, user } }', async () => {
  // re-import module to get the singleton instance (module was already imported in beforeEach)
  const mod = await import('../api')
  const { apiService } = mod

  // mock POST /auth/login to return wrapped response
  axiosInstance.post.mockResolvedValue({
    status: 200,
    data: { data: { token: 'tok-1', user: { id: 'u1', name: 'Test' } } },
  })

  const res = await apiService.login({ email: 'x@example.com', password: 'p' })
  expect(res.token).toBe('tok-1')
  expect(res.user).toEqual({ id: 'u1', name: 'Test' })
  expect(localStorage.getItem('authToken')).toBe('tok-1')
  expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 'u1', name: 'Test' }))

  localStorage.clear()
})

test('request interceptor does not add Authorization when no authToken', async () => {
  // ensure interceptor was registered
  expect(typeof requestFulfilled).toBe('function')
  const cfg: any = { headers: {} }
  const out = await requestFulfilled(cfg)
  expect(out.headers.Authorization).toBeUndefined()
})

test('getAllActivityLogs accepts wrapped and direct response shapes', async () => {
  const mod = await import('../api')
  const { apiService } = mod

  // wrapped shape
  axiosInstance.get.mockResolvedValueOnce({
    status: 200,
    data: { data: [{ id: 'log-1', note: 'wrapped' }] },
  })
  let res = await apiService.getAllActivityLogs()
  expect(Array.isArray(res)).toBe(true)
  expect(res[0].id).toBe('log-1')

  // direct shape
  axiosInstance.get.mockResolvedValueOnce({
    status: 200,
    data: [{ id: 'log-2', note: 'direct' }],
  })
  res = await apiService.getAllActivityLogs()
  expect(Array.isArray(res)).toBe(true)
  expect(res[0].id).toBe('log-2')
})

test('getAllActivityTypes tolerates wrapped and direct response shapes', async () => {
  const mod = await import('../api')
  const { apiService } = mod

  axiosInstance.get.mockResolvedValueOnce({
    status: 200,
    data: { data: [{ id: 'type-1', name: 'Wrapped' }] },
  })
  let types = await apiService.getAllActivityTypes()
  expect(Array.isArray(types)).toBe(true)
  expect(types[0].id).toBe('type-1')

  axiosInstance.get.mockResolvedValueOnce({
    status: 200,
    data: [{ id: 'type-2', name: 'Direct' }],
  })
  types = await apiService.getAllActivityTypes()
  expect(Array.isArray(types)).toBe(true)
  expect(types[0].id).toBe('type-2')
})

test('getChallenges returns empty array on 404 (no endpoint)', async () => {
  const mod = await import('../api')
  const { apiService } = mod

  // mark as an axios error so ApiService.handleError recognizes it
  axiosInstance.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
  const challenges = await apiService.getChallenges()
  expect(Array.isArray(challenges)).toBe(true)
  expect(challenges.length).toBe(0)
})

test('getCurrentUserId reads id from stored user in localStorage', async () => {
  const mod = await import('../api')
  const { apiService } = mod

  localStorage.setItem('user', JSON.stringify({ id: 'user-xyz', name: 'X' }))
  const id = (apiService as 
    any).getCurrentUserId?.()
  expect(id).toBe('user-xyz')
  localStorage.removeItem('user')
})