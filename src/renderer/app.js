/**
 * GhostPad Chat UI
 * Handles message display, screenshot capture, and user interactions
 */

// State management
const messages = [] // Chat history array
let capturedScreenshot = null // Current screenshot base64
let isScreenshotActive = false // Screenshot button state

// DOM element references
const messagesContainer = document.getElementById('messages-container')
const messageInput = document.getElementById('message-input')
const sendBtn = document.getElementById('send-btn')
const screenshotBtn = document.getElementById('screenshot-btn')
const homeBtn = document.getElementById('home-btn')
const closeBtn = document.getElementById('close-btn')

/**
 * Initialize the application
 */
function init() {
  // Screenshot button - capture immediately and highlight icon
  screenshotBtn.addEventListener('click', handleScreenshotCapture)

  // Send button - send message with optional screenshot
  sendBtn.addEventListener('click', handleSendMessage)

  // Enter key to send message
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendBtn.click()
    }
  })

  // Home button - open settings window
  homeBtn.addEventListener('click', () => {
    window.electronAPI.openSettings()
  })

  // Close button - quit application
  closeBtn.addEventListener('click', () => {
    window.electronAPI.quitApp()
  })

  // Ctrl+R new chat handler
  window.electronAPI.onNewChat(handleNewChat)

  console.log('GhostPad initialized')
}

/**
 * Handle screenshot capture
 */
async function handleScreenshotCapture() {
  try {
    console.log('Capturing screenshot...')
    const result = await window.electronAPI.captureScreen()

    if (result.success) {
      capturedScreenshot = result.base64
      screenshotBtn.classList.add('active')
      isScreenshotActive = true
      console.log('Screenshot captured and attached')
    } else {
      console.error('Screenshot capture failed:', result.error)
      showError('Failed to capture screenshot')
    }
  } catch (error) {
    console.error('Screenshot error:', error)
    showError('Screenshot error: ' + error.message)
  }
}

/**
 * Handle sending a message
 */
async function handleSendMessage() {
  const text = messageInput.value.trim()

  // Don't send empty messages
  if (!text) return

  // Disable send button during processing
  sendBtn.disabled = true
  messageInput.disabled = true

  try {
    // Add user message to UI
    addMessage('user', text, isScreenshotActive)

    // Clear input immediately for better UX
    messageInput.value = ''

    // Add loading indicator
    const loadingId = addLoadingMessage()

    // Send to LLM with optional screenshot
    console.log('Sending message to LLM...', { hasScreenshot: isScreenshotActive })
    const result = await window.electronAPI.sendMessage(text, capturedScreenshot)

    // Remove loading indicator
    removeLoadingMessage(loadingId)

    if (result.success) {
      // Add AI response
      addMessage('ai', result.response, false)
      console.log('Response received from', result.provider)
    } else {
      // Show error message
      showError(result.error || 'Failed to get response')
    }
  } catch (error) {
    console.error('Send message error:', error)
    showError('Error: ' + error.message)
  } finally {
    // Reset state
    capturedScreenshot = null
    screenshotBtn.classList.remove('active')
    isScreenshotActive = false

    // Re-enable input
    sendBtn.disabled = false
    messageInput.disabled = false
    messageInput.focus()
  }
}

/**
 * Add a message to the chat UI
 * @param {string} type - 'user' or 'ai'
 * @param {string} text - Message content
 * @param {boolean} hasScreenshot - Whether the message includes a screenshot
 */
function addMessage(type, text, hasScreenshot = false) {
  // Remove empty state if it exists
  const emptyState = messagesContainer.querySelector('.empty-state')
  if (emptyState) {
    emptyState.remove()
  }

  // Create message element
  const messageEl = document.createElement('div')
  messageEl.className = `message ${type}`
  messageEl.textContent = text

  // Add screenshot indicator for user messages with screenshots
  if (hasScreenshot && type === 'user') {
    const meta = document.createElement('div')
    meta.className = 'message-meta'
    meta.textContent = 'Sent with screenshot'
    messageEl.appendChild(meta)
  }

  // Add to container and scroll to bottom
  messagesContainer.appendChild(messageEl)
  messagesContainer.scrollTop = messagesContainer.scrollHeight

  // Store in message history
  messages.push({ type, text, hasScreenshot })
}

/**
 * Add a loading indicator message
 * @returns {string} - Loading message ID for removal
 */
function addLoadingMessage() {
  const loadingId = 'loading-' + Date.now()
  const loadingEl = document.createElement('div')
  loadingEl.className = 'message ai'
  loadingEl.id = loadingId
  loadingEl.textContent = 'Thinking...'
  loadingEl.style.opacity = '0.6'

  messagesContainer.appendChild(loadingEl)
  messagesContainer.scrollTop = messagesContainer.scrollHeight

  return loadingId
}

/**
 * Remove the loading indicator message
 * @param {string} loadingId - ID of the loading message
 */
function removeLoadingMessage(loadingId) {
  const loadingEl = document.getElementById(loadingId)
  if (loadingEl) {
    loadingEl.remove()
  }
}

/**
 * Show an error message in the chat
 * @param {string} errorText - Error message to display
 */
function showError(errorText) {
  const errorEl = document.createElement('div')
  errorEl.className = 'message ai'
  errorEl.style.borderColor = 'rgba(255, 74, 74, 0.3)'
  errorEl.style.background = 'rgba(255, 74, 74, 0.1)'
  errorEl.textContent = '⚠️ ' + errorText

  messagesContainer.appendChild(errorEl)
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

/**
 * Handle new chat event (Ctrl+R)
 * Clears all messages and resets state
 */
function handleNewChat() {
  console.log('Starting new chat...')

  // Clear message history
  messages.length = 0

  // Reset UI to empty state
  messagesContainer.innerHTML = `
    <div class="empty-state">
      <h2>Welcome to GhostPad</h2>
      <p>Capture your screen and ask questions</p>
    </div>
  `

  // Reset screenshot state
  capturedScreenshot = null
  screenshotBtn.classList.remove('active')
  isScreenshotActive = false

  // Clear input
  messageInput.value = ''
  messageInput.focus()
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
