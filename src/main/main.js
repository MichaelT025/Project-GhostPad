const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { captureAndCompress } = require('../services/screen-capture')
const LLMFactory = require('../services/llm-factory')
const ConfigService = require('../services/config-service')
const SessionStorage = require('../services/session-storage')

let mainWindow = null
let settingsWindow = null
let configService = null
let sessionStorage = null
let overlayExpandedBounds = null
let overlayIsCollapsed = false

// Create the main overlay window
function createMainWindow() {
  // Get primary display work area
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay

  // Calculate position - right side but more centered vertically
  const width = 550
  const height = 500
  const paddingRight = 100  // More space from right edge
  const paddingTop = 80     // More space from top edge
  
  const x = workArea.x + workArea.width - width - paddingRight
  const y = workArea.y + paddingTop

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    icon: path.join(__dirname, '../renderer/assets/icons/main_icon/favicon.ico'),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  overlayExpandedBounds = mainWindow.getBounds()

  // Allow window in system screenshots by default (PrtSc, etc.)
  // Content protection will be enabled temporarily during app screenshot capture
  mainWindow.setContentProtection(false)

  // Load the overlay first
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // Open DevTools for debugging (disabled for production)
  // mainWindow.webContents.openDevTools()

  // Track expanded size so we can restore after collapse
  mainWindow.on('resize', () => {
    if (!mainWindow || overlayIsCollapsed) return
    overlayExpandedBounds = mainWindow.getBounds()
  })

  // If user drags window while collapsed, keep the new position for restore
  mainWindow.on('move', () => {
    if (!mainWindow || !overlayIsCollapsed || !overlayExpandedBounds) return
    const currentBounds = mainWindow.getBounds()
    overlayExpandedBounds = {
      ...overlayExpandedBounds,
      x: currentBounds.x,
      y: currentBounds.y
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Create the dashboard window (replaces standalone settings)
function createDashboardWindow() {
  // Don't create if already exists
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore()
    }
    settingsWindow.show()
    settingsWindow.focus()
    return
  }

  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { workArea } = primaryDisplay

  const dashboardWidth = 980
  const dashboardHeight = 720

  // Keep dashboard clear of the right-edge overlay by default
  const overlayWidth = 550
  const overlayPaddingRight = 100
  const gapBetweenWindows = 60

  const overlayLeft = workArea.x + workArea.width - overlayWidth - overlayPaddingRight
  let dashboardX = overlayLeft - gapBetweenWindows - dashboardWidth

  // Clamp so the dashboard never goes off the left edge
  const minMarginLeft = 24
  if (dashboardX < workArea.x + minMarginLeft) {
    dashboardX = workArea.x + minMarginLeft
  }

  const dashboardY = workArea.y + Math.max(40, Math.round((workArea.height - dashboardHeight) / 2))

  settingsWindow = new BrowserWindow({
    width: dashboardWidth,
    height: dashboardHeight,
    x: dashboardX,
    y: dashboardY,
    icon: path.join(__dirname, '../renderer/assets/icons/main_icon/favicon.ico'),
    modal: false,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Load dashboard/homepage
  settingsWindow.loadFile(path.join(__dirname, '../renderer/homepage.html'))

  // Show when ready
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show()
  })

  // Handle window closed
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// Register global hotkeys
function registerHotkeys() {
  // Ctrl+/ to toggle window visibility (minimize to taskbar)
  globalShortcut.register('CommandOrControl+/', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
        mainWindow.focus()
      } else {
        mainWindow.minimize()
      }
    }
  })

  // Ctrl+R to start new chat
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('new-chat')
    }
  })

  // Ctrl+' to toggle overlay collapse
  globalShortcut.register('CommandOrControl+\'', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-collapse')
    }
  })
}

// App lifecycle events
app.whenReady().then(() => {
  // Initialize config service with user data path
  const userDataPath = app.getPath('userData')
  configService = new ConfigService(userDataPath)
  sessionStorage = new SessionStorage(userDataPath)

  // Best-effort cleanup (do not block app startup)
  sessionStorage.cleanupOldSessions().catch(error => {
    console.error('Failed to cleanup old sessions:', error)
  })

  createMainWindow()
  registerHotkeys()

  // On macOS it's common to re-create a window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Unregister shortcuts when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// IPC Handlers
ipcMain.handle('capture-screen', async () => {
  try {
    console.log('Screen capture requested')

    // Temporarily enable content protection to exclude app from this capture
    if (mainWindow) {
      mainWindow.setContentProtection(true)
    }

    // Small delay to ensure content protection takes effect
    await new Promise(resolve => setTimeout(resolve, 100))

    // Capture and compress the screenshot
    // The overlay is now excluded via temporary setContentProtection(true)
    const { base64, size } = await captureAndCompress()

    console.log(`Screenshot captured successfully (${(size / 1024 / 1024).toFixed(2)}MB)`)

    return {
      success: true,
      base64,
      size
    }
  } catch (error) {
    console.error('Failed to capture screen:', error)

    return {
      success: false,
      error: error.message
    }
  } finally {
    // Always re-disable content protection so app is visible in system screenshots (PrtSc)
    if (mainWindow) {
      mainWindow.setContentProtection(false)
    }
  }
})

// Helper function to check if provider is local (doesn't require API key)
function isLocalProvider(providerName) {
  return providerName === 'ollama' || providerName === 'lm-studio'
}

ipcMain.handle('send-message', async (event, { text, imageBase64, conversationHistory, summary }) => {
  try {
    console.log('Message send requested:', text, { hasSummary: !!summary })

    // Get active provider and API key
    const providerName = configService.getActiveProvider()
    const apiKey = configService.getApiKey(providerName)

    // Only require API key for non-local providers
    if (!isLocalProvider(providerName) && !apiKey) {
      return {
        success: false,
        error: `No API key configured for ${providerName}. Please add your API key in settings.`
      }
    }

    // Get provider configuration and merge with active mode's system prompt
    const config = configService.getProviderConfig(providerName)
    const activeSystemPrompt = configService.getActiveSystemPrompt()

    // Merge system prompt from active mode into config
    const configWithPrompt = {
      ...config,
      systemPrompt: activeSystemPrompt
    }

    // Create provider instance
    const provider = LLMFactory.createProvider(providerName, apiKey, configWithPrompt)

    // Handle summary by prepending to conversation context
    let historyWithSummary = conversationHistory || []
    let promptWithSummary = text
    
    if (summary) {
      // If we have conversation history, prepend summary to the first message
      if (historyWithSummary.length > 0) {
        const firstMsg = historyWithSummary[0]
        historyWithSummary = [
          {
            ...firstMsg,
            text: `[Context from earlier conversation: ${summary}]\n\n${firstMsg.text}`
          },
          ...historyWithSummary.slice(1)
        ]
      } else {
        // If no history, prepend summary to current prompt
        promptWithSummary = `[Context from earlier conversation: ${summary}]\n\n${text}`
      }
    }

    // Stream response chunks to renderer
    await provider.streamResponse(promptWithSummary, imageBase64, historyWithSummary, (chunk) => {
      event.sender.send('message-chunk', chunk)
    })

    // Signal completion
    event.sender.send('message-complete')

    console.log('Response streaming completed')

    return {
      success: true,
      provider: providerName
    }
  } catch (error) {
    console.error('Failed to send message:', error)

    // Send error to renderer
    event.sender.send('message-error', error.message)

    return {
      success: false,
      error: error.message
    }
  }
})

// Generate conversation summary
ipcMain.handle('generate-summary', async (_event, messages) => {
  try {
    console.log('Summary generation requested for', messages.length, 'messages')

    // Get active provider and API key
    const providerName = configService.getActiveProvider()
    const apiKey = configService.getApiKey(providerName)

    // Only require API key for non-local providers
    if (!isLocalProvider(providerName) && !apiKey) {
      return {
        success: false,
        error: `No API key configured for ${providerName}`
      }
    }

    // Get provider configuration WITHOUT system prompt for summary generation
    // This prevents context bleed between chats (especially for Gemini)
    const config = configService.getProviderConfig(providerName)
    const summaryConfig = {
      ...config,
      systemPrompt: '' // Clear system prompt for summary generation
    }

    // Create provider instance
    const provider = LLMFactory.createProvider(providerName, apiKey, summaryConfig)

    // Build summary prompt
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 500)}`)
      .join('\n\n')

    const summaryPrompt = `Summarize this conversation concisely (under 200 words). Focus on:
- Main topics discussed
- Key decisions or conclusions
- Important context for future messages

Conversation:
${conversationText}

Provide a clear, contextual summary:`

    // Generate summary (non-streaming)
    let summary = ''
    await provider.streamResponse(summaryPrompt, null, [], (chunk) => {
      summary += chunk
    })

    console.log('Summary generated:', summary.length, 'characters')

    return {
      success: true,
      summary: summary.trim()
    }
  } catch (error) {
    console.error('Failed to generate summary:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// Config management IPC handlers
ipcMain.handle('save-api-key', async (_event, { provider, apiKey }) => {
  try {
    configService.setApiKey(provider, apiKey)
    console.log(`API key saved for provider: ${provider}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to save API key:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-api-key', async (_event, provider) => {
  try {
    const apiKey = configService.getApiKey(provider)
    return { success: true, apiKey }
  } catch (error) {
    console.error('Failed to get API key:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-active-provider', async (_event, provider) => {
  try {
    configService.setActiveProvider(provider)
    console.log(`Active provider set to: ${provider}`)

    // Notify main window that config changed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-changed')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to set active provider:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-active-provider', async () => {
  try {
    const provider = configService.getActiveProvider()
    return { success: true, provider }
  } catch (error) {
    console.error('Failed to get active provider:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-provider-config', async (_event, provider) => {
  try {
    const config = configService.getProviderConfig(provider)
    return { success: true, config }
  } catch (error) {
    console.error('Failed to get provider config:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-provider-config', async (_event, { provider, config }) => {
  try {
    configService.setProviderConfig(provider, config)
    console.log(`Provider config saved for: ${provider}`)

    // Notify main window that config changed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-changed')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to set provider config:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('validate-api-key', async (_event, provider) => {
  try {
    const apiKey = configService.getApiKey(provider)

    // Local providers don't require API key - skip validation
    if (isLocalProvider(provider)) {
      return { success: true, isValid: true }
    }

    if (!apiKey) {
      return { success: false, isValid: false, error: 'No API key configured' }
    }

    const config = configService.getProviderConfig(provider)
    const providerInstance = LLMFactory.createProvider(provider, apiKey, config)
    const isValid = await providerInstance.validateApiKey()

    return { success: true, isValid }
  } catch (error) {
    console.error('Failed to validate API key:', error)
    return { success: false, isValid: false, error: error.message }
  }
})

ipcMain.handle('get-displays', async () => {
  try {
    const { screen } = require('electron')
    const displays = screen.getAllDisplays().map((display, index) => ({
      id: display.id,
      index,
      primary: display.bounds.x === 0 && display.bounds.y === 0,
      width: display.size.width,
      height: display.size.height,
      scaleFactor: display.scaleFactor
    }))

    console.log(`Found ${displays.length} displays`)
    return { success: true, displays }
  } catch (error) {
    console.error('Failed to get displays:', error)
    return { success: false, displays: [], error: error.message }
  }
})

// Mode management IPC handlers
ipcMain.handle('get-modes', async () => {
  try {
    const modes = configService.getModes()
    return { success: true, modes }
  } catch (error) {
    console.error('Failed to get modes:', error)
    return { success: false, modes: [], error: error.message }
  }
})

ipcMain.handle('save-mode', async (_event, mode) => {
  try {
    configService.saveMode(mode)
    console.log(`Mode saved: ${mode.name}`)

    // Notify main window that config changed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-changed')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to save mode:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-mode', async (_event, modeId) => {
  try {
    configService.deleteMode(modeId)
    console.log(`Mode deleted: ${modeId}`)

    // Notify main window that config changed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-changed')
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete mode:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-active-mode', async () => {
  try {
    const modeId = configService.getActiveMode()
    return { success: true, modeId }
  } catch (error) {
    console.error('Failed to get active mode:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-active-mode', async (_event, modeId) => {
  try {
    configService.setActiveMode(modeId)
    console.log(`Active mode set to: ${modeId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to set active mode:', error)
    return { success: false, error: error.message }
  }
})

// Open dashboard window (replaces standalone settings)
ipcMain.handle('open-settings', async () => {
  try {
    createDashboardWindow()
    return { success: true }
  } catch (error) {
    console.error('Failed to open dashboard:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('focus-overlay', async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Main window not available' }
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.show()
    mainWindow.focus()
    return { success: true }
  } catch (error) {
    console.error('Failed to focus overlay:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('resume-session-in-overlay', async (_event, sessionId) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Main window not available' }
    }

    // If the dashboard is open, get it out of the way
    // so the resumed chat replaces what the user sees.
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide()
    }

    mainWindow.webContents.send('resume-session', sessionId)
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
    return { success: true }
  } catch (error) {
    console.error('Failed to resume session in overlay:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('start-new-chat-in-overlay', async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Main window not available' }
    }

    // If the dashboard is open, get it out of the way.
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide()
    }

    mainWindow.webContents.send('new-chat')
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
    return { success: true }
  } catch (error) {
    console.error('Failed to start new chat in overlay:', error)
    return { success: false, error: error.message }
  }
})

// Hide main window
ipcMain.handle('hide-window', async () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('dashboard-minimize', async () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.minimize()
  }
})

ipcMain.handle('dashboard-close', async () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close()
  }
})

// Collapse/expand overlay window so it doesn't block the screen
ipcMain.on('set-collapsed', (_event, payload) => {
  if (!mainWindow) return

  const collapsed = typeof payload === 'boolean' ? payload : !!payload?.collapsed
  const requestedHeight = typeof payload === 'object' && payload !== null ? payload.height : undefined

  const defaultCollapsedHeight = 136
  const collapsedHeight = Number.isFinite(requestedHeight)
    ? Math.max(110, Math.min(Math.round(requestedHeight), 400))
    : defaultCollapsedHeight

  if (collapsed) {
    // Capture current expanded bounds right before shrinking
    if (!overlayIsCollapsed) {
      overlayExpandedBounds = mainWindow.getBounds()
    } else if (!overlayExpandedBounds) {
      overlayExpandedBounds = mainWindow.getBounds()
    }

    overlayIsCollapsed = true
    const currentBounds = mainWindow.getBounds()

    // Keep top-left anchored; preserve width
    mainWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: currentBounds.width,
      height: collapsedHeight
    })
  } else {
    overlayIsCollapsed = false

    if (overlayExpandedBounds) {
      mainWindow.setBounds(overlayExpandedBounds)
    }
  }
})

// Memory settings IPC handlers
ipcMain.handle('get-memory-settings', async () => {
  try {
    const settings = configService.getMemorySettings()
    return { success: true, settings }
  } catch (error) {
    console.error('Failed to get memory settings:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-history-limit', async () => {
  try {
    const limit = configService.getHistoryLimit()
    return { success: true, limit }
  } catch (error) {
    console.error('Failed to get history limit:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-history-limit', async (_event, limit) => {
  try {
    configService.setHistoryLimit(limit)
    console.log(`History limit set to: ${limit}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to set history limit:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-summarization-enabled', async (_event, enabled) => {
  try {
    configService.setSummarizationEnabled(enabled)
    console.log(`Summarization enabled: ${enabled}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to set summarization enabled:', error)
    return { success: false, error: error.message }
  }
})

// Model refresh IPC handlers
ipcMain.handle('refresh-models', async (_event, providerId) => {
  try {
    const ModelRefreshService = require('../services/model-refresh')

    // Get API key for the provider
    const apiKey = configService.getApiKey(providerId)

    // Refresh models
    const result = await ModelRefreshService.refreshModels(providerId, apiKey)

    if (result.success) {
      console.log(`Successfully refreshed models for ${providerId}`)
      return { success: true, models: result.models }
    } else {
      console.error(`Failed to refresh models for ${providerId}:`, result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('Error in refresh-models handler:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('check-model-cache-stale', async (_event, providerId) => {
  try {
    const ModelRefreshService = require('../services/model-refresh')
    const isStale = ModelRefreshService.isCacheStale(providerId)
    return { success: true, isStale }
  } catch (error) {
    console.error('Error checking cache staleness:', error)
    return { success: false, error: error.message }
  }
})

// Quit application
ipcMain.handle('quit-app', async () => {
  app.quit()
})

// Load custom icons from directory
ipcMain.handle('load-custom-icons', async () => {
  try {
    const iconsPath = path.join(__dirname, '../renderer/assets/icons/custom-icons')
    const icons = {}

    // Read all files in custom-icons directory
    const files = await fs.readdir(iconsPath)

    // Filter for .svg files only
    const svgFiles = files.filter(file => file.endsWith('.svg'))

    console.log(`Loading ${svgFiles.length} custom icons from ${iconsPath}`)

    // Load each SVG file
    for (const file of svgFiles) {
      const filePath = path.join(iconsPath, file)
      const iconName = file.replace('.svg', '')
      const svgContent = await fs.readFile(filePath, 'utf-8')
      icons[iconName] = svgContent
    }

    console.log(`Loaded custom icons: ${Object.keys(icons).join(', ')}`)
    return icons
  } catch (error) {
    console.error('Failed to load custom icons:', error)
    return {}
  }
})

// New handlers for provider registry and config management
ipcMain.handle('get-all-providers-meta', async () => {
  try {
    const LLMFactory = require('../services/llm-factory')
    const providers = LLMFactory.getAllProvidersMeta()
    return { success: true, providers }
  } catch (error) {
    console.error('Failed to get provider metadata:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-configured-providers', async () => {
  try {
    if (!configService) {
      return { success: false, error: 'Config service not initialized' }
    }
    
    const providers = configService.getAllConfig().providers || {}
    const configured = {}
    
    // Return only providers that have API keys configured
    for (const [providerId, providerConfig] of Object.entries(providers)) {
      if (providerConfig.apiKey && providerConfig.apiKey.length > 0) {
        configured[providerId] = providerConfig
      }
    }
    
    return { success: true, providers: configured }
  } catch (error) {
    console.error('Failed to get configured providers:', error)
    return { success: false, error: error.message }
  }
})

// Session storage IPC handlers
ipcMain.handle('save-session', async (_event, session) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized' }
    }

    const saved = await sessionStorage.saveSession(session)
    return { success: true, session: saved }
  } catch (error) {
    console.error('Failed to save session:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-session', async (_event, id) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized' }
    }

    const session = await sessionStorage.loadSession(id)
    return { success: true, session }
  } catch (error) {
    console.error('Failed to load session:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-sessions', async () => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized', sessions: [] }
    }

    const sessions = await sessionStorage.getAllSessions()
    return { success: true, sessions }
  } catch (error) {
    console.error('Failed to get all sessions:', error)
    return { success: false, error: error.message, sessions: [] }
  }
})

ipcMain.handle('delete-session', async (_event, id) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized' }
    }

    await sessionStorage.deleteSession(id)
    return { success: true }
  } catch (error) {
    console.error('Failed to delete session:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('rename-session', async (_event, { id, newTitle }) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized' }
    }
    await sessionStorage.renameSession(id, newTitle)
    return { success: true }
  } catch (error) {
    console.error('Failed to rename session:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('toggle-session-saved', async (_event, id) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized' }
    }
    const result = await sessionStorage.toggleSessionSaved(id)
    return { success: true, session: result }
  } catch (error) {
    console.error('Failed to toggle session saved:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-session-saved', async (_event, { id, isSaved }) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized' }
    }
    const result = await sessionStorage.setSessionSaved(id, isSaved)
    return { success: true, session: result }
  } catch (error) {
    console.error('Failed to set session saved:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('show-session-context-menu', async (event, sessionId) => {
  const { Menu, BrowserWindow } = require('electron')
  
  // Check if session is saved
  let isSaved = false
  if (sessionStorage) {
    try {
      const session = await sessionStorage.loadSession(sessionId)
      isSaved = !!session?.isSaved
    } catch (e) {
      console.error('Error loading session for context menu:', e)
    }
  }

  return new Promise((resolve) => {
    const template = [
      {
        label: 'Rename',
        click: () => {
          event.sender.send('context-menu-command', { command: 'rename', sessionId })
        }
      },
      { type: 'separator' },
      {
        label: isSaved ? 'Unsave' : 'Save',
        click: () => {
          event.sender.send('context-menu-command', { command: 'save', sessionId })
        }
      }
    ]
    const menu = Menu.buildFromTemplate(template)
    // Find the window that sent the request to attach menu correctly
    const win = BrowserWindow.fromWebContents(event.sender)
    menu.popup({ window: win })
    resolve()
  })
})

ipcMain.handle('search-sessions', async (_event, query) => {
  try {
    if (!sessionStorage) {
      return { success: false, error: 'Session storage not initialized', sessions: [] }
    }

    const sessions = await sessionStorage.searchSessions(query)
    return { success: true, sessions }
  } catch (error) {
    console.error('Failed to search sessions:', error)
    return { success: false, error: error.message, sessions: [] }
  }
})
