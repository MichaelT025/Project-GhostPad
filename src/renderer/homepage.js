import { initIcons, insertIcon } from './assets/icons/icons.js'

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
    window.alert(result?.error || 'Failed to delete session')
  }

  await loadSessions()
}

async function handleNewChat() {
  await window.electronAPI.startNewChatInOverlay()
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty">
      <h2>No conversations yet</h2>
      <p>Start a new chat to see it here. Tip: Press <code>Ctrl+R</code> to start a new chat from anywhere.</p>
      <button id="empty-new-chat" class="primary-btn" type="button">Start New Chat</button>
    </div>
  `

  const btn = document.getElementById('empty-new-chat')
  if (btn) {
    btn.addEventListener('click', handleNewChat)
  }
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

      const left = document.createElement('div')
      left.className = 'session-left'

      const title = document.createElement('div')
      title.className = 'session-title'
      title.textContent = session.title || 'New Chat'

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

      right.appendChild(count)
      right.appendChild(time)

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

      const activate = () => handleSessionClick(session.id)

      card.addEventListener('click', activate)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate()
        }
      })

      card.appendChild(left)
      card.appendChild(right)
      card.appendChild(deleteBtn)

      container.appendChild(card)
    }
  }
}

let searchTimer = null

async function loadSessions(query = '') {
  const container = document.getElementById('content')
  if (!container) return

  const trimmed = (query || '').trim()
  const result = trimmed
    ? await window.electronAPI.searchSessions(trimmed)
    : await window.electronAPI.getAllSessions()

  const sessions = result?.success ? (result.sessions || []) : []

  if (!result?.success && result?.error) {
    container.innerHTML = `<div class="empty"><h2>Couldn’t load sessions</h2><p>${result.error}</p></div>`
    return
  }

  renderSessionList(container, sessions)
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
    })
  }

  if (navModes) {
    navModes.addEventListener('click', () => {
      window.alert('Modes page is coming soon.')
    })
  }

  if (navConfiguration) {
    navConfiguration.addEventListener('click', async () => {
      await window.electronAPI.openSettings()
    })
  }

  if (navShortcuts) {
    navShortcuts.addEventListener('click', () => {
      window.alert('Shortcuts page is coming soon.')
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
  const searchInput = document.getElementById('search-input')
  const reportBugBtn = document.getElementById('report-bug')
  const quitBtn = document.getElementById('quit-shade')
  const minimizeBtn = document.getElementById('dashboard-minimize')
  const closeBtn = document.getElementById('dashboard-close')

  newChatBtn?.addEventListener('click', handleNewChat)

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

  reportBugBtn?.addEventListener('click', () => {
    window.alert('Coming soon: bug reporter. For now, open an issue on GitHub.')
  })

  quitBtn?.addEventListener('click', async () => {
    const ok = window.confirm('Quit Shade?')
    if (!ok) return
    await window.electronAPI.quitApp()
  })

  window.electronAPI.onNewChat(() => {
    handleNewChat().catch(console.error)
  })

  wireNavigation()
  loadSessions().catch(console.error)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
