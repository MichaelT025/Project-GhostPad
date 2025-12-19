import { describe, test, expect, vi, beforeEach } from 'vitest'

// We don't need to mock the module if we inject the mock client
const OpenAIProvider = (await import('../openai-provider.js')).default

describe('OpenAIProvider', () => {
  let provider
  let mockClient

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mocks for client methods
    const mockChatCreate = vi.fn()
    const mockModelsList = vi.fn()
    
    // Create the mock client structure
    mockClient = {
      chat: {
        completions: {
          create: mockChatCreate
        }
      },
      models: {
        list: mockModelsList
      }
    }

    // Instantiate provider (this will create a real OpenAI client initially)
    provider = new OpenAIProvider('test-key', { model: 'gpt-4o' })
    
    // Inject our mock client
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
    
    const isValid = await provider.validateApiKey()
    
    expect(isValid).toBe(false)
  })

  test('sendMessage sends text-only message correctly', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Hello there' } }]
    })

    const response = await provider.sendMessage('Hello')

    expect(response).toBe('Hello there')
    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }]
    }))
  })

  test('sendMessage sends multimodal message correctly', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'I see an image' } }]
    })

    await provider.sendMessage('Look at this', 'base64data')

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,base64data' } }
          ]
        }
      ]
    }))
  })

  test('streamResponse handles streaming correctly', async () => {
    const mockChunk = { choices: [{ delta: { content: 'chunk' } }] }
    
    // Mock async iterator for stream
    mockClient.chat.completions.create.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield mockChunk
        yield mockChunk
      }
    })

    const onChunk = vi.fn()
    await provider.streamResponse('Hello', null, [], onChunk)

    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledWith('chunk')
  })

  test('streamResponse handles conversation history', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {}
    })

    const history = [
      { type: 'user', text: 'Hi' },
      { type: 'ai', text: 'Hello' }
    ]

    await provider.streamResponse('New message', null, history, () => {})

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'New message' }
      ]
    }), expect.anything())
  })

  test('sendMessage throws error when API rejects image (non-vision model)', async () => {
    mockClient.chat.completions.create.mockRejectedValue(new Error('400 Bad Request: Model does not support image_url'))

    await expect(provider.sendMessage('Look', 'base64data'))
      .rejects
      .toThrow('OpenAI API error: 400 Bad Request: Model does not support image_url')
  })
})
