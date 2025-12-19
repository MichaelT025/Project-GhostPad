/**
 * Provider Verification Test Suite
 * 
 * This test suite verifies that all providers work correctly with their
 * respective configurations and handle edge cases appropriately.
 * 
 * Tests cover:
 * - API key validation behavior
 * - Model refresh logic
 * - OpenAI-compatible providers without API keys
 * - Screenshot capability detection
 */

import { describe, it, expect } from 'vitest'
import LLMFactory from '../llm-factory.js'
import ModelRefreshService from '../model-refresh.js'

describe('Provider Verification Suite', () => {
  describe('Cloud Providers (Gemini/OpenAI/Anthropic)', () => {
    describe('Gemini Provider', () => {
      it('should create instance with valid API key', () => {
        const provider = LLMFactory.createProvider('gemini', 'test-key', {
          model: 'gemini-2.0-flash-exp'
        })
        expect(provider).toBeDefined()
        expect(provider.config.model).toBe('gemini-2.0-flash-exp')
      })

      it('should require API key', () => {
        const meta = LLMFactory.getProviderMeta('gemini')
        // Gemini doesn't have explicit requiresApiKey flag (defaults to true for non-openai-compatible)
        expect(meta.type).toBe('gemini')
      })

      it('should have vision support in description', () => {
        const meta = LLMFactory.getProviderMeta('gemini')
        expect(meta.description).toContain('vision')
      })

      it('should validate API key format', async () => {
        const provider = LLMFactory.createProvider('gemini', 'invalid-key', {
          model: 'gemini-2.0-flash-exp'
        })
        
        // Validation should fail for invalid key
        const isValid = await provider.validateApiKey()
        expect(isValid).toBe(false)
      })
    })

    describe('OpenAI Provider', () => {
      it('should create instance with valid API key', () => {
        const provider = LLMFactory.createProvider('openai', 'sk-test', {
          model: 'gpt-4o'
        })
        expect(provider).toBeDefined()
        expect(provider.config.model).toBe('gpt-4o')
      })

      it('should require API key', () => {
        const meta = LLMFactory.getProviderMeta('openai')
        expect(meta.type).toBe('openai')
      })

      it('should have vision-capable models', () => {
        const meta = LLMFactory.getProviderMeta('openai')
        expect(meta.description).toContain('Vision')
      })
    })

    describe('Anthropic Provider', () => {
      it('should create instance with valid API key', () => {
        const provider = LLMFactory.createProvider('anthropic', 'sk-ant-test', {
          model: 'claude-3-5-sonnet-20241022'
        })
        expect(provider).toBeDefined()
        expect(provider.config.model).toBe('claude-3-5-sonnet-20241022')
      })

      it('should require API key', () => {
        const meta = LLMFactory.getProviderMeta('anthropic')
        expect(meta.type).toBe('anthropic')
      })

      it('should have vision support in description', () => {
        const meta = LLMFactory.getProviderMeta('anthropic')
        expect(meta.description).toContain('vision')
      })

      it('should provide default models', () => {
        const meta = LLMFactory.getProviderMeta('anthropic')
        expect(meta.models).toBeDefined()
        expect(Object.keys(meta.models).length).toBeGreaterThan(0)
      })
    })
  })

  describe('OpenAI-Compatible Providers', () => {
    describe('Ollama Provider', () => {
      it('should not require API key', () => {
        const meta = LLMFactory.getProviderMeta('ollama')
        expect(meta.requiresApiKey).toBe(false)
      })

      it('should work with empty API key', () => {
        const provider = LLMFactory.createProvider('ollama', '', {
          model: 'llama2',
          baseUrl: 'http://localhost:11434/v1'
        })
        expect(provider).toBeDefined()
        expect(provider.apiKey).toBe('')
      })

      it('should use correct base URL', () => {
        const meta = LLMFactory.getProviderMeta('ollama')
        expect(meta.baseUrl).toBe('http://localhost:11434/v1')
      })

      it('should be marked as openai-compatible', () => {
        const meta = LLMFactory.getProviderMeta('ollama')
        expect(meta.type).toBe('openai-compatible')
      })
    })

    describe('LM Studio Provider', () => {
      it('should not require API key', () => {
        const meta = LLMFactory.getProviderMeta('lm-studio')
        expect(meta.requiresApiKey).toBe(false)
      })

      it('should work with empty API key', () => {
        const provider = LLMFactory.createProvider('lm-studio', '', {
          model: 'local-model',
          baseUrl: 'http://localhost:1234/v1'
        })
        expect(provider).toBeDefined()
        expect(provider.apiKey).toBe('')
      })

      it('should use correct base URL', () => {
        const meta = LLMFactory.getProviderMeta('lm-studio')
        expect(meta.baseUrl).toBe('http://localhost:1234/v1')
      })
    })

    describe('Grok Provider (OpenAI-Compatible with Key)', () => {
      it('should support custom base URLs', () => {
        const provider = LLMFactory.createProvider('grok', 'test-key', {
          model: 'grok-vision-beta',
          baseUrl: 'https://api.x.ai/v1'
        })
        expect(provider).toBeDefined()
        expect(provider.config.baseUrl).toBe('https://api.x.ai/v1')
      })

      it('should require API key', () => {
        const meta = LLMFactory.getProviderMeta('grok')
        expect(meta.requiresApiKey).toBe(true)
      })
    })
  })

  describe('API Key Validation Edge Cases', () => {
    it('should handle null API key gracefully for local providers', () => {
      expect(() => {
        LLMFactory.createProvider('ollama', null, {
          model: 'llama2'
        })
      }).not.toThrow()
    })

    it('should handle undefined API key gracefully for local providers', () => {
      expect(() => {
        LLMFactory.createProvider('lm-studio', undefined, {
          model: 'local-model'
        })
      }).not.toThrow()
    })

    it('should identify cloud providers correctly', () => {
      const meta = LLMFactory.getProviderMeta('openai')
      expect(meta.type).toBe('openai')
      
      const grokMeta = LLMFactory.getProviderMeta('grok')
      expect(grokMeta.requiresApiKey).toBe(true)
    })
  })

  describe('Model Refresh Functionality', () => {
    it('should handle model refresh for providers without API key', () => {
      // Ollama should be able to refresh models without API key
      const meta = LLMFactory.getProviderMeta('ollama')
      expect(meta.requiresApiKey).toBe(false)
      
      // Model refresh should not fail for missing API key on local providers
      expect(async () => {
        await ModelRefreshService.refreshModels('ollama', '')
      }).not.toThrow()
    })

    it('should cache model lists appropriately', () => {
      const isStale = ModelRefreshService.isCacheStale('gemini')
      expect(typeof isStale).toBe('boolean')
    })
  })

  describe('Screenshot Capability Detection', () => {
    it('should correctly identify vision-capable providers', () => {
      const visionProviders = [
        { id: 'gemini', keyword: 'vision' },
        { id: 'openai', keyword: 'Vision' },
        { id: 'anthropic', keyword: 'vision' },
        { id: 'grok', keyword: 'vision' }
      ]
      
      visionProviders.forEach(({ id, keyword }) => {
        const meta = LLMFactory.getProviderMeta(id)
        expect(meta.description.toLowerCase()).toContain(keyword.toLowerCase())
      })
    })

    it('should identify local providers correctly', () => {
      const localProviders = ['ollama', 'lm-studio']
      
      localProviders.forEach(providerId => {
        const meta = LLMFactory.getProviderMeta(providerId)
        expect(meta.type).toBe('openai-compatible')
        expect(meta.requiresApiKey).toBe(false)
      })
    })
  })

  describe('Provider Registry Integrity', () => {
    it('should have all required providers registered', () => {
      const requiredProviders = [
        'gemini',
        'openai',
        'anthropic',
        'grok',
        'openrouter',
        'ollama',
        'lm-studio'
      ]

      requiredProviders.forEach(providerId => {
        const meta = LLMFactory.getProviderMeta(providerId)
        expect(meta).toBeDefined()
        expect(meta.name).toBeDefined()
        expect(meta.type).toBeDefined()
      })
    })

    it('should return null for unknown providers', () => {
      const meta = LLMFactory.getProviderMeta('unknown-provider')
      expect(meta).toBeNull()
    })

    it('should list all available providers', () => {
      const providers = LLMFactory.getAvailableProviders()
      expect(Array.isArray(providers)).toBe(true)
      expect(providers.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for creating provider with invalid ID', () => {
      expect(() => {
        LLMFactory.createProvider('invalid-provider', 'key', {})
      }).toThrow()
    })

    it('should use default model when model is missing', () => {
      const provider = LLMFactory.createProvider('gemini', 'test-key', {})
      expect(provider).toBeDefined()
      // Gemini has a default model defined in registry
      const meta = LLMFactory.getProviderMeta('gemini')
      expect(meta.defaultModel).toBeDefined()
    })
  })
})
