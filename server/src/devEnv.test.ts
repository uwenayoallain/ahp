import { afterEach, describe, expect, test, vi } from 'vitest'

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  vi.resetModules()

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
})

describe('applyDevEnv', () => {
  test('loads .env outside production and test', async () => {
    process.env.NODE_ENV = 'development'
    const config = vi.fn(() => ({ parsed: {} }))

    vi.doMock('dotenv', () => ({ config }))

    const { applyDevEnv } = await import('./devEnv.js')
    applyDevEnv()

    expect(config).toHaveBeenCalledTimes(4)
    const firstCall = config.mock.calls[0] as unknown as [{ path: string }]
    expect(firstCall[0].path).toMatch(/\.env$/)
  })

  test('does not load .env during tests', async () => {
    process.env.NODE_ENV = 'test'
    const config = vi.fn(() => ({ parsed: {} }))

    vi.doMock('dotenv', () => ({ config }))

    const { applyDevEnv } = await import('./devEnv.js')
    applyDevEnv()

    expect(config).not.toHaveBeenCalled()
  })

  test('does not load .env in production', async () => {
    process.env.NODE_ENV = 'production'
    const config = vi.fn(() => ({ parsed: {} }))

    vi.doMock('dotenv', () => ({ config }))

    const { applyDevEnv } = await import('./devEnv.js')
    applyDevEnv()

    expect(config).not.toHaveBeenCalled()
  })
})
