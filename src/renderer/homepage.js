import { initIcons, insertIcon } from './assets/icons/icons.js'

import { showToast } from './utils/ui-helpers.js'

const selectedSessionIds = new Set()

function formatTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getDayLabel(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const atMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (isSameDay(atMidnight, today)) return 'Today'
  if (isSameDay(atMidnight, yesterday)) return 'Yesterday'

  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupSessionsByDay(sessions) {
  const groups = new Map()

  for (const session of sessions) {
    const key = getDayLabel(session.updatedAt || session.createdAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(session)
  }

  return groups
}

async function handleSessionClick(id) {
  await window.electronAPI.resumeSessionInOverlay(id)
}

async function handleDeleteSession(id) {
  const result = await window.electronAPI.deleteSession(id)
  if (!result?.success) {
    showToast(result?.error || 'Failed to delete session', 'error')
  }

  // Remove from selection if present
  if (selectedSessionIds.has(id)) {
    selectedSessionIds.delete(id)
    updateBulkModeUI()
  }

  await loadSessions()
}

let renameModalSessionId = null

function openRenameModal(sessionId, currentTitle = '') {
  const backdrop = document.getElementById('rename-modal')
  const input = document.getElementById('rename-input')
  const status = document.getElementById('rename-status')
  if (!backdrop || !input) return

  renameModalSessionId = sessionId
  if (status) status.textContent = ''

  input.value = (currentTitle || '').trim() || 'New Chat'
  backdrop.classList.add('open')

  // Focus + select for quick editing
  setTimeout(() => {
    input.focus()
    input.select()
  }, 0)
}

function closeRenameModal() {
  const backdrop = document.getElementById('rename-modal')
  const status = document.getElementById('rename-status')
  if (status) status.textContent = ''
  renameModalSessionId = null
  backdrop?.classList.remove('open')
}

async function submitRenameModal() {
  const input = document.getElementById('rename-input')
  const status = document.getElementById('rename-status')
  const id = renameModalSessionId
  if (!input || !id) return

  const finalTitle = (input.value || '').trim() || 'New Chat'
  const result = await window.electronAPI.renameSession(id, finalTitle)
  if (result?.success) {
    closeRenameModal()
    await loadSessions()
  } else {
    if (status) status.textContent = result?.error || 'Failed to rename.'
  }
}

async function handleRenameSession(id) {
  // Find current title from DOM to pre-fill
  let currentTitle = ''
  const card = document.querySelector(`.session-card[data-session-id="${id}"]`)
  if (card) {
    currentTitle = card.querySelector('.session-title')?.textContent || ''
  }

  openRenameModal(id, currentTitle)
}

let showingSaved = false

async function handleToggleSaved(id) {
  const result = await window.electronAPI.toggleSessionSaved(id)
  if (!result?.success) {
    showToast('Failed to update saved status: ' + (result?.error || 'Unknown error'), 'error')
  }
  // Refresh list
  await loadSessions()
}

async function handleNewChat() {
  await window.electronAPI.startNewChatInOverlay()
}

function renderEmptyState(container) {
  if (showingSaved) {
    container.innerHTML = `
      <div class="empty">
        <h2>No saved conversations</h2>
        <p>Save important conversations to see them here.</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="empty">
      <h2>No conversations yet</h2>
      <p>Start a new chat to see it here. Tip: Press <code>Ctrl+R</code> to start a new chat from anywhere.</p>
      <button id="empty-new-chat" class="new-chat-btn" type="button" style="max-width: 240px; margin-top: var(--space-8);">
        <span class="nav-icon" data-icon="newchat"></span>
        Start New Chat
      </button>
    </div>
  `

  const iconSpan = container.querySelector('[data-icon="newchat"]')
  if (iconSpan) {
    insertIcon(iconSpan, 'newchat')
  }

  const btn = document.getElementById('empty-new-chat')
  if (btn) {
    btn.addEventListener('click', handleNewChat)
  }
}

function toggleBulkModeUI(active) {
  const container = document.querySelector('.quick-actions')
  if (!container) return

  container.innerHTML = ''

  if (active) {
    container.style.gridTemplateColumns = '1fr 1fr 1fr'

    // Button 1: Delete
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'action-btn danger'
    deleteBtn.type = 'button'
    deleteBtn.innerHTML = `<span class="nav-icon" data-icon="trash"></span> Delete (${selectedSessionIds.size})`
    
    deleteBtn.addEventListener('click', async () => {
      const count = selectedSessionIds.size
      if (count === 0) return
      
      const ok = window.confirm(`Permanently delete ${count} conversation${count === 1 ? '' : 's'}?`)
      if (!ok) return

      // Perform deletion
      for (const id of selectedSessionIds) {
        await window.electronAPI.deleteSession(id)
      }
      
      selectedSessionIds.clear()
      updateBulkModeUI() // Reset UI
      await loadSessions()
    })
    container.appendChild(deleteBtn)

    // Button 2: Save
    const saveBtn = document.createElement('button')
    saveBtn.className = 'action-btn'
    saveBtn.type = 'button'
    saveBtn.innerHTML = `<span class="nav-icon" data-icon="save"></span> Save`
    
    saveBtn.addEventListener('click', async () => {
      const count = selectedSessionIds.size
      if (count === 0) return

      for (const id of selectedSessionIds) {
        await window.electronAPI.setSessionSaved(id, true)
      }
      
      selectedSessionIds.clear()
      updateBulkModeUI()
      await loadSessions()
    })
    container.appendChild(saveBtn)

    // Button 3: Cancel
    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'action-btn'
    cancelBtn.type = 'button'
    cancelBtn.innerHTML = `<span class="nav-icon" data-icon="close"></span> Cancel`
    
    cancelBtn.addEventListener('click', () => {
      selectedSessionIds.clear()
      updateBulkModeUI()
      loadSessions() // Re-render to uncheck boxes
    })
    container.appendChild(cancelBtn)

  } else {
    container.style.gridTemplateColumns = '1fr 1fr'

    // Button 1: New Chat
    const newChatBtn = document.createElement('button')
    newChatBtn.id = 'new-chat'
    newChatBtn.className = 'action-btn primary'
    newChatBtn.type = 'button'
    newChatBtn.innerHTML = `<span class="nav-icon" data-icon="newchat"></span> New chat`
    newChatBtn.addEventListener('click', handleNewChat)
    container.appendChild(newChatBtn)

    // Button 2: Saved
    const savedBtn = document.createElement('button')
    savedBtn.id = 'saved-messages'
    savedBtn.className = showingSaved ? 'action-btn active' : 'action-btn'
    savedBtn.type = 'button'
    savedBtn.innerHTML = `<span class="nav-icon" data-icon="save"></span> ${showingSaved ? 'All Chats' : 'Saved'}`
    savedBtn.addEventListener('click', () => {
      showingSaved = !showingSaved
      
      // Update button text/state immediately
      savedBtn.innerHTML = `<span class="nav-icon" data-icon="save"></span> ${showingSaved ? 'All Chats' : 'Saved'}`
      if (showingSaved) {
        savedBtn.classList.add('active')
        // Optional: style "active" if you want it to look pressed
      } else {
        savedBtn.classList.remove('active')
      }
      insertIcon(savedBtn.querySelector('.nav-icon'), 'save')

      // Clear search if we toggle modes? Maybe keep it.
      const searchInput = document.getElementById('search-input')
      if (searchInput) {
        searchInput.value = ''
      }
      
      loadSessions().catch(console.error)
    })
    container.appendChild(savedBtn)
  }

  // Inject icons
  container.querySelectorAll('[data-icon]').forEach(el => {
    insertIcon(el, el.dataset.icon)
  })
}

function updateBulkModeUI() {
  const active = selectedSessionIds.size > 0
  toggleBulkModeUI(active)
}

function renderSessionList(container, sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    renderEmptyState(container)
    return
  }

  const groups = groupSessionsByDay(sessions)

  container.innerHTML = ''

  for (const [label, items] of groups.entries()) {
    const header = document.createElement('div')
    header.className = 'date-header'
    header.textContent = label
    container.appendChild(header)

    for (const session of items) {
      const card = document.createElement('div')
      card.className = 'session-card'
      card.setAttribute('role', 'button')
      card.setAttribute('tabindex', '0')
      card.dataset.sessionId = session.id // For reference lookup

      // Checkbox container
      const checkboxContainer = document.createElement('div')
      checkboxContainer.className = 'session-checkbox-container'
      
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'session-checkbox'
      checkbox.checked = selectedSessionIds.has(session.id)
      
      // Stop propagation to prevent opening session when clicking checkbox
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation()
      })
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedSessionIds.add(session.id)
        } else {
          selectedSessionIds.delete(session.id)
        }
        updateBulkModeUI()
      })

      checkboxContainer.appendChild(checkbox)
      card.appendChild(checkboxContainer)

      const left = document.createElement('div')
      left.className = 'session-left'

      const title = document.createElement('div')
      title.className = 'session-title'
      
      // Add star if saved
      if (session.isSaved) {
        const starSpan = document.createElement('span')
        starSpan.className = 'star-icon'
        starSpan.dataset.icon = 'star'
        title.appendChild(starSpan)
        insertIcon(starSpan, 'star')
        
        const titleText = document.createElement('span')
        titleText.textContent = session.title || 'New Chat'
        title.appendChild(titleText)
      } else {
        title.textContent = session.title || 'New Chat'
      }

      const subtitle = document.createElement('div')
      subtitle.className = 'session-subtitle'
      subtitle.textContent = session.provider ? `${session.provider}${session.model ? ` • ${session.model}` : ''}` : ''

      left.appendChild(title)
      left.appendChild(subtitle)

      const right = document.createElement('div')
      right.className = 'session-right'

      const count = document.createElement('span')
      count.className = 'pill'
      const messageCount = Number.isFinite(session.messageCount) ? session.messageCount : 0
      count.textContent = `${messageCount} msg${messageCount === 1 ? '' : 's'}`

      const time = document.createElement('span')
      time.className = 'timestamp'
      time.textContent = formatTime(session.updatedAt || session.createdAt)

      const renameBtn = document.createElement('button')
      renameBtn.className = 'rename-btn'
      renameBtn.type = 'button'
      renameBtn.title = 'Rename session'

      const pencilIconSpan = document.createElement('span')
      pencilIconSpan.className = 'rename-icon'
      pencilIconSpan.setAttribute('data-icon', 'pencil')
      renameBtn.appendChild(pencilIconSpan)
      insertIcon(pencilIconSpan, 'pencil', 'rename-icon')

      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        handleRenameSession(session.id)
      })

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'delete-btn'
      deleteBtn.type = 'button'
      deleteBtn.title = 'Delete session'
      
      const trashIconSpan = document.createElement('span')
      trashIconSpan.className = 'trash-icon'
      trashIconSpan.setAttribute('data-icon', 'trash')
      
      deleteBtn.appendChild(trashIconSpan)
      insertIcon(trashIconSpan, 'trash', 'trash-icon')
      
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        handleDeleteSession(session.id)
      })

      // Append in specific order for CSS to handle visibility
      right.appendChild(count)
      right.appendChild(time)
      right.appendChild(renameBtn)
      right.appendChild(deleteBtn)

      const activate = () => handleSessionClick(session.id)

      card.addEventListener('click', activate)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate()
        }
      })
      
      // Context menu handler
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        window.electronAPI.showSessionContextMenu(session.id)
      })

      card.appendChild(left)
      card.appendChild(right)
      
      container.appendChild(card)
    }
  }
}

let searchTimer = null

async function loadSessions(query = '') {
  const container = document.getElementById('content')
  if (!container) return

  const trimmed = (query || '').trim()
  let result = trimmed
    ? await window.electronAPI.searchSessions(trimmed)
    : await window.electronAPI.getAllSessions()

  let sessions = result?.success ? (result.sessions || []) : []

  if (showingSaved) {
    sessions = sessions.filter(s => s.isSaved)
  }

  if (!result?.success && result?.error) {
    container.innerHTML = `<div class="empty"><h2>Couldn’t load sessions</h2><p>${result.error}</p></div>`
    return
  }

  renderSessionList(container, sessions)
}

function showView(viewId) {
  // Hide all views
  document.querySelectorAll('.view-container').forEach(el => {
    el.style.display = 'none'
  })

  // Show requested view
  const view = document.getElementById(viewId)
  if (view) {
    view.style.display = 'flex'
  }
}

let configViewInitialized = false
let cachedProvidersMeta = null
let cachedActiveProvider = null

function normalizeProvidersMeta(providers) {
  if (!providers) return []

  // ProviderRegistry.getAllProviders() returns an object keyed by providerId
  if (!Array.isArray(providers) && typeof providers === 'object') {
    return Object.entries(providers).map(([id, meta]) => ({
      id,
      ...meta
    }))
  }

  // Already an array
  return providers.map(p => ({
    id: p.id || p.providerId || p.name,
    ...p
  })).filter(p => p.id)
}

function getProviderLabel(provider) {
  // Prefer explicit label/name from metadata, fallback to id
  return provider?.label || provider?.displayName || provider?.name || provider?.id
}

function extractModelsFromProviderMeta(providerMeta) {
  const models = providerMeta?.models
  if (!models) return []

  if (Array.isArray(models)) {
    return models.map(m => ({
      id: m.id || m.model || m.name,
      ...m
    })).filter(m => m.id)
  }

  // models is an object keyed by modelId
  if (typeof models === 'object') {
    return Object.entries(models).map(([id, meta]) => ({ id, ...meta }))
  }

  return []
}

async function fetchConfigurationState(force = false) {
  if (!force && cachedProvidersMeta && cachedActiveProvider) {
    return { providers: cachedProvidersMeta, activeProvider: cachedActiveProvider }
  }

  const [providersResult, activeResult] = await Promise.all([
    window.electronAPI.getAllProvidersMeta(),
    window.electronAPI.getActiveProvider()
  ])

  const providers = normalizeProvidersMeta(providersResult?.success ? providersResult.providers : null)
  const activeProvider = activeResult?.success ? activeResult.provider : ''

  cachedProvidersMeta = providers
  cachedActiveProvider = activeProvider

  return { providers, activeProvider }
}

function renderConfig(container, state) {
  const providers = state.providers || []

  if (!Array.isArray(providers) || providers.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <h2>Couldn’t load providers</h2>
        <p>Try restarting Shade, or check your configuration.</p>
      </div>
    `
    return
  }

  const activeProvider = state.activeProvider || (providers[0]?.id || '')

  const providerOptions = providers
    .slice()
    .sort((a, b) => getProviderLabel(a).localeCompare(getProviderLabel(b)))
    .map(p => `<option value="${p.id}">${getProviderLabel(p)}</option>`)
    .join('')

  container.innerHTML = `
    <div class="config-card">
      <h2>Provider</h2>
      <p>Select which provider Shade uses for new chats.</p>
      <div class="form-row">
        <div class="form-field">
          <label for="config-provider">Active provider</label>
          <select id="config-provider" class="select-input">
            ${providerOptions}
          </select>
        </div>
      </div>
    </div>

     <div id="config-api-key-card" class="config-card">
      <h2>API Key</h2>
      <div class="form-row">
        <div class="form-field" style="min-width: 320px;">
          <label for="config-api-key">API key</label>
          <input id="config-api-key" class="text-input" type="password" placeholder="Enter API key" autocomplete="off" />
          <div id="config-key-status" class="status-line"></div>
        </div>
        <div class="inline-actions">
          <button id="config-key-save" class="mini-btn primary" type="button">Save</button>
          <button id="config-key-clear" class="mini-btn danger" type="button">Clear</button>
          <button id="config-key-test" class="mini-btn" type="button">Test key</button>
        </div>
      </div>
    </div>

    <div class="config-card">
      <h2>Models</h2>
      <p>Choose the default model for the active provider.</p>
      <div class="form-row">
        <div class="form-field">
          <label for="config-model-search">Search models</label>
          <input id="config-model-search" class="text-input" type="text" placeholder="Search by name" autocomplete="off" />
          <div class="helper-text">Some models don't support screenshots.</div>
          <div class="helper-text">Some models might not work with this application.</div>
        </div>
        <div class="inline-actions">
          <button id="config-refresh-models" class="mini-btn" type="button">Refresh models</button>
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-12);">
        <div class="form-field">
          <label for="config-model-select">Default model</label>
          <select id="config-model-select" class="select-input" size="6"></select>
          <div id="config-model-status" class="status-line"></div>
        </div>
      </div>
    </div>

    <div class="config-card">
      <h2>Sessions</h2>
      <p>Control session naming and startup behavior.</p>
      <div class="form-row">
        <div class="form-field">
          <label>Auto-title sessions</label>
          <div class="inline-actions">
            <label class="toggle-switch" aria-label="Auto-title sessions">
              <input id="config-auto-title" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
            <div id="config-auto-title-msg" class="helper-text" style="margin-top: 0;"></div>
          </div>
        </div>
      </div>

      <div class="form-row" style="margin-top: var(--space-10);">
        <div class="form-field">
          <label>Start overlay collapsed</label>
          <div class="inline-actions">
            <label class="toggle-switch" aria-label="Start overlay collapsed">
              <input id="config-start-collapsed" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
            <div id="config-start-collapsed-msg" class="helper-text" style="margin-top: 0;"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="config-card">
      <h2>Screenshots</h2>
      <p>Control whether screenshots auto-attach when you send.</p>
      <div class="form-row">
        <div class="form-field">
          <label>Auto-attach screenshots</label>
          <div class="inline-actions">
            <label class="toggle-switch" aria-label="Auto-attach screenshots">
              <input id="config-screenshot-mode" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
            <div id="config-screenshot-mode-msg" class="helper-text" style="margin-top: 0;"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="config-card">
      <h2>Memory</h2>
      <p>Control what gets persisted to sessions.</p>
      <div class="form-row">
        <div class="form-field">
          <label>Exclude screenshots from memory</label>
          <div class="inline-actions">
            <label class="toggle-switch" aria-label="Exclude screenshots from memory">
              <input id="config-exclude-screenshots" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
            <div id="config-exclude-screenshots-msg" class="helper-text" style="margin-top: 0;"></div>
          </div>
        </div>
      </div>
    </div>
  `

  const providerSelect = container.querySelector('#config-provider')
  if (providerSelect) providerSelect.value = activeProvider
}

function setStatus(el, text, kind) {
  if (!el) return
  el.textContent = text
  el.classList.remove('good', 'bad')
  if (kind === 'good') el.classList.add('good')
  if (kind === 'bad') el.classList.add('bad')
}

async function updateProviderDependentUI(container, providerId) {
  const keyInput = container.querySelector('#config-api-key')
  const keyStatus = container.querySelector('#config-key-status')
  const modelSelect = container.querySelector('#config-model-select')
  const modelStatus = container.querySelector('#config-model-status')
  const modelSearch = container.querySelector('#config-model-search')
  const apiKeyCard = container.querySelector('#config-api-key-card')

  // Hide API key section for local providers (ollama, lm-studio)
  const isLocalProvider = providerId === 'ollama' || providerId === 'lm-studio'
  if (apiKeyCard) {
    apiKeyCard.style.display = isLocalProvider ? 'none' : 'block'
  }

  setStatus(keyStatus, '', null)
  setStatus(modelStatus, '', null)

  const [keyResult, providerConfigResult, state] = await Promise.all([
    window.electronAPI.getApiKey(providerId),
    window.electronAPI.getProviderConfig(providerId),
    fetchConfigurationState()
  ])

  const apiKey = keyResult?.success ? (keyResult.apiKey || '') : ''
  if (keyInput) {
    keyInput.value = apiKey
  }

  const providerConfig = providerConfigResult?.success ? (providerConfigResult.config || {}) : {}
  const selectedModelId = providerConfig.model || ''

  const providerMeta = (state.providers || []).find(p => p.id === providerId)
  const models = extractModelsFromProviderMeta(providerMeta)
    .sort((a, b) => (a.id || '').localeCompare(b.id || ''))

  const query = (modelSearch?.value || '').trim().toLowerCase()
  let filteredModels = query
    ? models.filter(m => (m.id || '').toLowerCase().includes(query))
    : models

  // Always keep the selected model at the top (when it exists)
  if (selectedModelId) {
    const selectedIndex = filteredModels.findIndex(m => m.id === selectedModelId)
    if (selectedIndex > 0) {
      const [selected] = filteredModels.splice(selectedIndex, 1)
      filteredModels = [selected, ...filteredModels]
    }
  }

  if (modelSelect) {
    if (!filteredModels.length) {
      modelSelect.innerHTML = '<option value="">No models found</option>'
      modelSelect.value = ''
      modelSelect.disabled = true
      return
    }

    modelSelect.disabled = false
    modelSelect.innerHTML = filteredModels
      .map(m => `<option value="${m.id}">${m.id}</option>`)
      .join('')

    // Preserve current selection if present; otherwise fall back to first option
    const candidate = selectedModelId && filteredModels.some(m => m.id === selectedModelId)
      ? selectedModelId
      : (filteredModels[0]?.id || '')

    modelSelect.value = candidate

    // If selection differs from stored config (e.g., config empty), show a hint
    if (selectedModelId && candidate !== selectedModelId) {
      setStatus(modelStatus, 'Selected model is filtered out by search.', null)
    } else {
      setStatus(modelStatus, '', null)
    }
  }
}

async function initConfigurationView() {
  const container = document.getElementById('config-content')
  if (!container) return

  const state = await fetchConfigurationState(true)
  renderConfig(container, state)

  const providerSelect = container.querySelector('#config-provider')
  const keyInput = container.querySelector('#config-api-key')
  const keyStatus = container.querySelector('#config-key-status')
  const saveBtn = container.querySelector('#config-key-save')
  const clearBtn = container.querySelector('#config-key-clear')
  const testBtn = container.querySelector('#config-key-test')
  const refreshModelsBtn = container.querySelector('#config-refresh-models')
  const modelSearch = container.querySelector('#config-model-search')
  const modelSelect = container.querySelector('#config-model-select')
  const modelStatus = container.querySelector('#config-model-status')

  const autoTitleToggle = container.querySelector('#config-auto-title')
  const autoTitleMsg = container.querySelector('#config-auto-title-msg')
  const startCollapsedToggle = container.querySelector('#config-start-collapsed')
  const startCollapsedMsg = container.querySelector('#config-start-collapsed-msg')
  const screenshotModeToggle = container.querySelector('#config-screenshot-mode')
  const screenshotModeMsg = container.querySelector('#config-screenshot-mode-msg')
  const excludeScreenshotsToggle = container.querySelector('#config-exclude-screenshots')
  const excludeScreenshotsMsg = container.querySelector('#config-exclude-screenshots-msg')

  const setAutoTitleMsg = (enabled) => {
    if (!autoTitleMsg) return
    autoTitleMsg.textContent = enabled
      ? 'On: generates a short title automatically.'
      : 'Off: keep the default title until you rename it.'
  }

  const setScreenshotMsg = (isAuto) => {
    if (!screenshotModeMsg) return
    screenshotModeMsg.textContent = isAuto
      ? 'Auto mode: captures and attaches your screen on every send.'
      : 'Manual mode: use the camera button / hotkey to attach a screenshot.'
  }

  const setStartCollapsedMsg = (startCollapsed) => {
    if (!startCollapsedMsg) return
    startCollapsedMsg.textContent = startCollapsed
      ? 'On: overlay starts collapsed.'
      : 'Off: overlay starts expanded.'
  }

  const setExcludeScreenshotsMsg = (exclude) => {
    if (!excludeScreenshotsMsg) return
    excludeScreenshotsMsg.textContent = exclude
      ? 'On: screenshot attachments are not stored in session history.'
      : 'Off: screenshots are stored in session history.'
  }

  const getSelectedProvider = () => providerSelect?.value || state.activeProvider || state.providers?.[0]?.id || ''

  // Load and apply non-provider settings
  try {
    const [sessionSettingsResult, startCollapsedResult, screenshotModeResult, excludeResult] = await Promise.all([
      window.electronAPI.getSessionSettings(),
      window.electronAPI.getStartCollapsed(),
      window.electronAPI.getScreenshotMode(),
      window.electronAPI.getExcludeScreenshotsFromMemory()
    ])

    const autoTitleEnabled = sessionSettingsResult?.success
      ? sessionSettingsResult.settings?.autoTitleSessions !== false
      : true

    if (autoTitleToggle) {
      autoTitleToggle.checked = autoTitleEnabled
      setAutoTitleMsg(autoTitleEnabled)
    }

    if (startCollapsedToggle) {
      const startCollapsed = startCollapsedResult?.success ? startCollapsedResult.startCollapsed !== false : true
      startCollapsedToggle.checked = startCollapsed
      setStartCollapsedMsg(startCollapsed)
    }

    if (screenshotModeToggle) {
      const mode = screenshotModeResult?.success ? screenshotModeResult.mode : 'manual'
      const isAuto = mode === 'auto'
      screenshotModeToggle.checked = isAuto
      setScreenshotMsg(isAuto)
    }

    if (excludeScreenshotsToggle) {
      const exclude = excludeResult?.success ? excludeResult.exclude !== false : true
      excludeScreenshotsToggle.checked = exclude
      setExcludeScreenshotsMsg(exclude)
    }
  } catch (error) {
    console.error('Failed to load config toggles:', error)
  }

  const setProvider = async (providerId) => {
    if (!providerId) return
    await window.electronAPI.setActiveProvider(providerId)
    cachedActiveProvider = providerId
    await updateProviderDependentUI(container, providerId)
  }

  providerSelect?.addEventListener('change', async () => {
    await setProvider(providerSelect.value)
  })

  autoTitleToggle?.addEventListener('change', async () => {
    try {
      const enabled = !!autoTitleToggle.checked
      setAutoTitleMsg(enabled)
      await window.electronAPI.setAutoTitleSessions(enabled)
    } catch (error) {
      console.error('Failed to update auto title setting:', error)
    }
  })

  startCollapsedToggle?.addEventListener('change', async () => {
    try {
      const startCollapsed = !!startCollapsedToggle.checked
      setStartCollapsedMsg(startCollapsed)
      await window.electronAPI.setStartCollapsed(startCollapsed)
    } catch (error) {
      console.error('Failed to update start collapsed setting:', error)
    }
  })
 
  screenshotModeToggle?.addEventListener('change', async () => {
    try {
      const isAuto = !!screenshotModeToggle.checked
      setScreenshotMsg(isAuto)
      await window.electronAPI.setScreenshotMode(isAuto ? 'auto' : 'manual')
    } catch (error) {
      console.error('Failed to update screenshot mode:', error)
    }
  })

  excludeScreenshotsToggle?.addEventListener('change', async () => {
    try {
      const exclude = !!excludeScreenshotsToggle.checked
      setExcludeScreenshotsMsg(exclude)
      await window.electronAPI.setExcludeScreenshotsFromMemory(exclude)
    } catch (error) {
      console.error('Failed to update exclude screenshots setting:', error)
    }
  })

  const autoTestKey = async () => {
    const providerId = getSelectedProvider()
    const apiKey = (keyInput?.value || '').trim()

    if (!apiKey) {
      setStatus(keyStatus, '', null)
      setStatus(modelStatus, '', null)
      return
    }

    // Persist first since validation reads from config
    await window.electronAPI.saveApiKey(providerId, apiKey)

    setStatus(keyStatus, 'Testing…', null)
    const result = await window.electronAPI.validateApiKey(providerId)
    if (result?.success) {
      setStatus(keyStatus, result.isValid ? 'Key is valid.' : 'Key is invalid.', result.isValid ? 'good' : 'bad')
    } else {
      setStatus(keyStatus, result?.error || 'Failed to validate key.', 'bad')
    }
  }

  let keyAutoTestTimer = null
  let lastAutoTest = { providerId: null, apiKey: null }

  const scheduleAutoTest = () => {
    if (!keyInput) return

    const providerId = getSelectedProvider()
    // Skip local providers (no API key required)
    if (providerId === 'ollama' || providerId === 'lm-studio') return

    const apiKey = (keyInput.value || '').trim()

    // Avoid redundant re-tests for same value
    if (lastAutoTest.providerId === providerId && lastAutoTest.apiKey === apiKey) return

    if (keyAutoTestTimer) {
      clearTimeout(keyAutoTestTimer)
      keyAutoTestTimer = null
    }

    // Debounce to avoid spamming validation on every keystroke
    keyAutoTestTimer = setTimeout(() => {
      lastAutoTest = { providerId, apiKey }
      autoTestKey().catch(console.error)
      keyAutoTestTimer = null
    }, 500)
  }

  // Auto-test when user pastes a key
  keyInput?.addEventListener('paste', () => {
    setTimeout(() => {
      scheduleAutoTest()
    }, 0)
  })

  // Auto-test whenever the key value changes
  keyInput?.addEventListener('input', () => {
    scheduleAutoTest()
  })

  // If user leaves the field, validate immediately (no debounce)
  keyInput?.addEventListener('blur', () => {
    if (!keyInput) return

    if (keyAutoTestTimer) {
      clearTimeout(keyAutoTestTimer)
      keyAutoTestTimer = null
    }

    const providerId = getSelectedProvider()
    if (providerId === 'ollama' || providerId === 'lm-studio') return

    const apiKey = (keyInput.value || '').trim()
    lastAutoTest = { providerId, apiKey }

    autoTestKey().catch(console.error)
  })

  saveBtn?.addEventListener('click', async () => {
    const providerId = getSelectedProvider()
    const apiKey = (keyInput?.value || '').trim()
    await window.electronAPI.saveApiKey(providerId, apiKey)
    setStatus(keyStatus, apiKey ? 'Saved.' : 'Cleared.', apiKey ? 'good' : null)
  })

  clearBtn?.addEventListener('click', async () => {
    const providerId = getSelectedProvider()
    if (keyInput) keyInput.value = ''
    await window.electronAPI.saveApiKey(providerId, '')
    setStatus(keyStatus, 'Cleared.', null)
  })

  testBtn?.addEventListener('click', async () => {
    await autoTestKey()
  })

  refreshModelsBtn?.addEventListener('click', async () => {
    const providerId = getSelectedProvider()
    const result = await window.electronAPI.refreshModels(providerId)
    if (!result?.success) {
      setStatus(keyStatus, result?.error || 'Failed to refresh models.', 'bad')
      return
    }

    // Re-fetch provider metadata after refresh
    cachedProvidersMeta = null
    await fetchConfigurationState(true)
    // Keep provider selection as-is
    if (providerSelect) providerSelect.value = providerId
    await updateProviderDependentUI(container, providerId)
    setStatus(keyStatus, 'Models refreshed.', 'good')
  })

  modelSearch?.addEventListener('input', async () => {
    await updateProviderDependentUI(container, getSelectedProvider())
  })

  modelSelect?.addEventListener('change', async () => {
    const providerId = getSelectedProvider()
    const modelId = modelSelect.value
    if (!providerId || !modelId) return

    setStatus(modelStatus, 'Saving…', null)

    const providerConfigResult = await window.electronAPI.getProviderConfig(providerId)
    const providerConfig = providerConfigResult?.success ? (providerConfigResult.config || {}) : {}

    await window.electronAPI.setProviderConfig(providerId, { ...providerConfig, model: modelId })
    setStatus(modelStatus, 'Saved.', 'good')

    await updateProviderDependentUI(container, providerId)
  })

  // Initial render of dependent bits
  await updateProviderDependentUI(container, getSelectedProvider())

  configViewInitialized = true
}

function wireNavigation() {
  const navSessions = document.getElementById('nav-sessions')
  const navModes = document.getElementById('nav-modes')
  const navConfiguration = document.getElementById('nav-configuration')
  const navShortcuts = document.getElementById('nav-shortcuts')

  if (navSessions) {
    navSessions.addEventListener('click', () => {
      navSessions.classList.add('active')
      navModes?.classList.remove('active')
      navConfiguration?.classList.remove('active')
      navShortcuts?.classList.remove('active')
      
      showView('view-sessions')
    })
  }

  if (navModes) {
    navModes.addEventListener('click', () => {
      showToast('Modes page is coming soon.', 'info')
    })
  }

  if (navConfiguration) {
    navConfiguration.addEventListener('click', async () => {
      navSessions?.classList.remove('active')
      navModes?.classList.remove('active')
      navShortcuts?.classList.remove('active')
      navConfiguration.classList.add('active')

      showView('view-configuration')

      if (!configViewInitialized) {
        await initConfigurationView()
      }
    })
  }

  if (navShortcuts) {
    navShortcuts.addEventListener('click', () => {
      navSessions?.classList.remove('active')
      navModes?.classList.remove('active')
      navConfiguration?.classList.remove('active')
      navShortcuts.classList.add('active')

      showView('view-shortcuts')
    })
  }
}

async function init() {
  await initIcons()

  // Inject icons
  document.querySelectorAll('[data-icon]').forEach(el => {
    insertIcon(el, el.dataset.icon, el.classList.contains('nav-icon') || el.classList.contains('search-icon') ? undefined : 'icon-svg')
  })

  const newChatBtn = document.getElementById('new-chat')
  const savedBtn = document.getElementById('saved-messages')
  // selectBtn removed
  const searchInput = document.getElementById('search-input')
  const checkUpdateBtn = document.getElementById('check-update')
  const reportBugBtn = document.getElementById('report-bug')
  const quitBtn = document.getElementById('quit-shade')
  const minimizeBtn = document.getElementById('dashboard-minimize')
  const closeBtn = document.getElementById('dashboard-close')

  newChatBtn?.addEventListener('click', handleNewChat)
  
  savedBtn?.addEventListener('click', () => {
    showingSaved = !showingSaved
    
    // Update button text/state
    if (savedBtn) {
      savedBtn.innerHTML = `<span class="nav-icon" data-icon="save"></span> ${showingSaved ? 'All Chats' : 'Saved'}`
      insertIcon(savedBtn.querySelector('.nav-icon'), 'save')
      if (showingSaved) {
        savedBtn.classList.add('active')
      } else {
        savedBtn.classList.remove('active')
      }
    }

    const searchInput = document.getElementById('search-input')
    if (searchInput) {
      searchInput.value = ''
    }
    loadSessions().catch(console.error)
  })

  // selectBtn listener removed

  minimizeBtn?.addEventListener('click', () => window.electronAPI.minimizeDashboard?.())
  closeBtn?.addEventListener('click', () => window.electronAPI.closeDashboard?.())

  searchInput?.addEventListener('input', (e) => {
    const value = e.target.value

    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }

    searchTimer = setTimeout(() => {
      loadSessions(value).catch(console.error)
      searchTimer = null
    }, 180)
  })

  checkUpdateBtn?.addEventListener('click', async () => {
    try {
      const result = await window.electronAPI.checkForUpdates()
      if (result.updateAvailable) {
        showToast(`Update available: v${result.version}`, 'info', 5000)
      } else {
        showToast('You are running the latest version.', 'success')
      }
    } catch (error) {
      console.error('Update check failed:', error)
      showToast('Failed to check for updates. Please try again later.', 'error')
    }
  })

  reportBugBtn?.addEventListener('click', () => {
    showToast('Bug reporter coming soon. Open an issue on GitHub.', 'info')
  })

  quitBtn?.addEventListener('click', async () => {
    await window.electronAPI.quitApp?.()
  })

  window.electronAPI.onNewChat(() => {
    handleNewChat().catch(console.error)
  })

  // Rename modal wiring
  const renameModal = document.getElementById('rename-modal')
  const renameInput = document.getElementById('rename-input')
  const renameCancel = document.getElementById('rename-cancel')
  const renameSave = document.getElementById('rename-save')

  renameCancel?.addEventListener('click', closeRenameModal)
  renameSave?.addEventListener('click', () => submitRenameModal().catch(console.error))

  renameModal?.addEventListener('click', (e) => {
    if (e.target === renameModal) {
      closeRenameModal()
    }
  })

  renameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeRenameModal()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submitRenameModal().catch(console.error)
    }
  })

  window.electronAPI.onContextMenuCommand(({ command, sessionId }) => {
    if (command === 'delete') {
      handleDeleteSession(sessionId)
    } else if (command === 'rename') {
      handleRenameSession(sessionId)
    } else if (command === 'save') {
      handleToggleSaved(sessionId)
    }
  })

  wireNavigation()
  loadSessions().catch(console.error)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
