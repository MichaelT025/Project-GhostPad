/**
 * Provider Registry
 * Loads and manages LLM provider metadata from JSON configuration
 */

const fs = require('fs')
const path = require('path')

// Default providers JSON (embedded fallback)
const defaultProviders = {
  gemini: {
    name: 'Google Gemini',
    type: 'gemini',
    description: 'Fast and efficient vision model',
    website: 'https://makersuite.google.com/app/apikey',
    defaultModel: 'gemini-2.0-flash-exp',
    models: {
      'gemini-2.0-flash-exp': { name: 'Gemini 2.0 Flash (Experimental)' },
      'gemini-1.5-flash': { name: 'Gemini 1.5 Flash' },
      'gemini-1.5-pro': { name: 'Gemini 1.5 Pro' }
    }
  },
  openai: {
    name: 'OpenAI',
    type: 'openai',
    description: 'Powerful multimodal AI',
    website: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o',
    models: {
      'gpt-4o': { name: 'GPT-4o' },
      'gpt-4o-mini': { name: 'GPT-4o Mini' },
      'o1': {
        name: 'o1',
        options: {
          reasoningEffort: 'high'
        }
      },
      'o1-mini': { name: 'o1 Mini' }
    }
  },
  anthropic: {
    name: 'Anthropic Claude',
    type: 'anthropic',
    description: 'Advanced reasoning capabilities',
    website: 'https://console.anthropic.com/',
    defaultModel: 'claude-sonnet-4',
    models: {
      'claude-sonnet-4': { name: 'Claude Sonnet 4' },
      'claude-opus-4': { name: 'Claude Opus 4' }
    }
  },
  ollama: {
    name: 'Ollama (Local)',
    type: 'openai-compatible',
    description: 'Run local models with Ollama',
    website: 'https://ollama.ai/',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: {
      'llama3.2': { name: 'Llama 3.2' },
      'qwen2.5-coder:7b': { name: 'Qwen 2.5 Coder 7B' },
      'deepseek-r1': { name: 'DeepSeek R1' }
    }
  }
}

let providers = null
let providersPath = null

/**
 * Initialize providers path
 * @param {string} userDataPath - Path to user data directory
 */
function initProvidersPath(userDataPath) {
  if (!userDataPath) {
    // Fallback to default providers if no user data path
    providers = { ...defaultProviders }
    return
  }

  providersPath = path.join(userDataPath, 'shade-providers.json')
  loadProviders()
}

/**
 * Load providers from JSON file
 * Falls back to default providers if file doesn't exist
 */
function loadProviders() {
  try {
    if (providersPath && fs.existsSync(providersPath)) {
      const data = fs.readFileSync(providersPath, 'utf8')
      providers = JSON.parse(data)
      console.log('Loaded providers from:', providersPath)
    } else {
      // Create default providers file
      providers = { ...defaultProviders }
      if (providersPath) {
        saveProviders()
        console.log('Created default providers file at:', providersPath)
      }
    }
  } catch (error) {
    console.error('Failed to load providers, using defaults:', error)
    providers = { ...defaultProviders }
  }
}

/**
 * Save providers to JSON file
 */
function saveProviders() {
  if (!providersPath) return

  try {
    fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to save providers:', error)
  }
}

/**
 * Get all provider IDs
 * @returns {string[]} Array of provider IDs
 */
function getProviderIds() {
  if (!providers) {
    providers = { ...defaultProviders }
  }
  return Object.keys(providers)
}

/**
 * Get all provider metadata
 * @returns {Object} All provider metadata
 */
function getAllProviders() {
  if (!providers) {
    providers = { ...defaultProviders }
  }
  return { ...providers }
}

/**
 * Get provider metadata by ID
 * @param {string} id - Provider ID
 * @returns {Object|null} Provider metadata or null if not found
 */
function getProvider(id) {
  if (!providers) {
    providers = { ...defaultProviders }
  }
  return providers[id] || null
}

/**
 * Check if provider exists
 * @param {string} id - Provider ID
 * @returns {boolean} True if provider exists
 */
function hasProvider(id) {
  if (!providers) {
    providers = { ...defaultProviders }
  }
  if (!id) return false
  return Object.keys(providers).some(providerId =>
    providerId.toLowerCase() === id.toLowerCase()
  )
}

/**
 * Get models for a provider
 * @param {string} id - Provider ID
 * @returns {Array} Array of model objects with id and metadata
 */
function getModels(id) {
  const provider = getProvider(id)
  if (!provider || !provider.models) return []

  // Convert models object to array format
  return Object.entries(provider.models).map(([modelId, modelMeta]) => ({
    id: modelId,
    ...modelMeta
  }))
}

/**
 * Generate default providers config object for config-service
 * @returns {Object} Default providers config
 */
function generateDefaultProvidersConfig() {
  if (!providers) {
    providers = { ...defaultProviders }
  }

  const config = {}
  for (const [providerId, providerMeta] of Object.entries(providers)) {
    config[providerId] = {
      apiKey: '',
      model: providerMeta.defaultModel || ''
    }

    // Add baseUrl for openai-compatible providers
    if (providerMeta.baseUrl) {
      config[providerId].baseUrl = providerMeta.baseUrl
    }
  }

  return config
}

module.exports = {
  initProvidersPath,
  loadProviders,
  getProviderIds,
  getAllProviders,
  getProvider,
  hasProvider,
  getModels,
  generateDefaultProvidersConfig
}
