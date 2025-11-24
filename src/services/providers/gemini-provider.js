const { GoogleGenerativeAI } = require('@google/generative-ai')
const LLMProvider = require('../llm-service')

/**
 * Google Gemini provider implementation
 * Uses the @google/generative-ai SDK (legacy, but stable)
 */
class GeminiProvider extends LLMProvider {
  constructor(apiKey, config = {}) {
    super(apiKey, config)

    // Default to gemini-2.5-flash (latest and best model)
    this.modelName = config.model || 'gemini-2.5-flash'

    // Initialize Gemini client
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: this.modelName })
  }

  /**
   * Send a message with optional image to Gemini
   * @param {string} text - The text message to send
   * @param {string|null} imageBase64 - Optional base64-encoded image (without data:image prefix)
   * @returns {Promise<string>} - The complete response from Gemini
   */
  async sendMessage(text, imageBase64 = null) {
    try {
      let parts = [text]

      // If image is provided, add it to the request
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        })
      }

      const result = await this.model.generateContent(parts)
      const response = result.response
      return response.text()
    } catch (error) {
      throw new Error(`Gemini API error: ${error.message}`)
    }
  }

  /**
   * Stream a response from Gemini with optional image
   * @param {string} text - The text message to send
   * @param {string|null} imageBase64 - Optional base64-encoded image
   * @param {Function} onChunk - Callback function for each chunk of response
   * @returns {Promise<void>}
   */
  async streamResponse(text, imageBase64 = null, onChunk) {
    try {
      let parts = [text]

      // If image is provided, add it to the request
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        })
      }

      const result = await this.model.generateContentStream(parts)

      // Stream the response chunks
      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        if (chunkText) {
          onChunk(chunkText)
        }
      }
    } catch (error) {
      throw new Error(`Gemini streaming error: ${error.message}`)
    }
  }

  /**
   * Validate that the API key is valid by making a test request
   * @returns {Promise<boolean>} - True if valid, false otherwise
   */
  async validateApiKey() {
    try {
      // Simple test request with minimal token usage
      const result = await this.model.generateContent('Hi')
      result.response.text()
      return true
    } catch (error) {
      console.error('API key validation failed:', error.message)
      return false
    }
  }

  /**
   * Get list of available Gemini models
   * @returns {Array<{id: string, name: string}>} - List of model objects
   */
  getModels() {
    return [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Latest)' }
    ]
  }

  /**
   * Get the provider name
   * @returns {string} - Provider name
   */
  getName() {
    return 'gemini'
  }
}

module.exports = GeminiProvider
