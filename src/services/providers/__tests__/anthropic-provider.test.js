import { describe, test, expect, vi, beforeEach } from 'vitest'

const AnthropicProvider = (await import('../anthropic-provider.js')).default

describe('AnthropicProvider', () => {
  let provider
  let mockClient

  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockMessagesCreate = vi.fn()
    const mockModelsList = vi.fn()
    
    mockClient = {
      messages: {
        create: mockMessagesCreate
      },
      models: {
        list: mockModelsList
      }
    }

    provider = new AnthropicProvider('test-key', { model: 'claude-3-5-sonnet-20240620' })
    provider.client = mockClient
  })

  test('validateApiKey returns true when models.list succeeds', async () => {
    mockClient.models.list.mockResolvedValue({ data: [] })
    
    const isValid = await provider.validateApiKey()
    
    expect(isValid).toBe(true)
    expect(mockClient.models.list).toHaveBeenCalled()
  })

  test('validateApiKey returns false when models.list fails', async () => {
    mockClient.models.list.mockRejectedValue(new Error('Invalid API key'))
    // Fallback to messages.create
    mockClient.messages.create.mockRejectedValue(new Error('Invalid API key fallback'))

    const isValid = await provider.validateApiKey()
    
    expect(isValid).toBe(false)
  })

  test('sendMessage sends text-only message correctly', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: 'Hello there' }]
    })

    const response = await provider.sendMessage('Hello')

    expect(response).toBe('Hello there')
    expect(mockClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-3-5-sonnet-20240620',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
    }))
  })

  test('sendMessage sends multimodal message correctly', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: 'I see an image' }]
    })

    await provider.sendMessage('Look at this', 'base64data')

    expect(mockClient.messages.create).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'base64data' } },
            { type: 'text', text: 'Look at this' }
          ]
        }
      ]
    }))
  })

  test('streamResponse handles streaming correctly', async () => {
    const mockEvent = { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk' } }
    
    // Mock async iterator
    mockClient.messages.create.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield mockEvent
        yield mockEvent
      }
    })

    const onChunk = vi.fn()
    await provider.streamResponse('Hello', null, [], onChunk)

    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledWith('chunk')
  })
})
