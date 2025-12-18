import { describe, test, expect, vi, beforeEach } from 'vitest'

const CustomProvider = (await import('../custom-provider.js')).default

describe('CustomProvider', () => {
  let modelsListMock
  let chatCreateMock

  beforeEach(() => {
    modelsListMock = vi.fn()
    chatCreateMock = vi.fn()
  })

  test('validateApiKey prefers models.list (no token usage)', async () => {
    modelsListMock.mockResolvedValue({ data: [] })

    const provider = new CustomProvider('test-key', { model: 'gpt-4o', baseUrl: 'https://openrouter.ai/api/v1' })
    provider.client = { models: { list: modelsListMock }, chat: { completions: { create: chatCreateMock } } }

    const isValid = await provider.validateApiKey()

    expect(isValid).toBe(true)
    expect(modelsListMock).toHaveBeenCalledTimes(1)
    expect(chatCreateMock).toHaveBeenCalledTimes(0)
  })

  test('validateApiKey falls back to chat completion when models.list fails', async () => {
    modelsListMock.mockRejectedValue(new Error('no models endpoint'))
    chatCreateMock.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })

    const provider = new CustomProvider('test-key', { model: 'gpt-4o', baseUrl: 'https://example.com/v1' })
    provider.client = { models: { list: modelsListMock }, chat: { completions: { create: chatCreateMock } } }

    const isValid = await provider.validateApiKey()

    expect(isValid).toBe(true)
    expect(modelsListMock).toHaveBeenCalledTimes(1)
    expect(chatCreateMock).toHaveBeenCalledTimes(1)
  })

  test('validateApiKey returns false when both models.list and chat completion fail', async () => {
    modelsListMock.mockRejectedValue(new Error('no models endpoint'))
    chatCreateMock.mockRejectedValue(new Error('unauthorized'))

    const provider = new CustomProvider('bad-key', { model: 'gpt-4o', baseUrl: 'https://example.com/v1' })
    provider.client = { models: { list: modelsListMock }, chat: { completions: { create: chatCreateMock } } }

    const isValid = await provider.validateApiKey()

    expect(isValid).toBe(false)
    expect(modelsListMock).toHaveBeenCalledTimes(1)
    expect(chatCreateMock).toHaveBeenCalledTimes(1)
  })
})
