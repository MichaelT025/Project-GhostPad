const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const { captureAndCompress } = require('../services/screen-capture')

let mainWindow = null

// Create the main overlay window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 550,
    height: 500,
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

  // Exclude this window from screen capture (Windows 10 v2004+)
  mainWindow.setContentProtection(true)

  // Load the renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools()

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Register global hotkeys
function registerHotkeys() {
  // Ctrl+/ to toggle window visibility
  globalShortcut.register('CommandOrControl+/', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // Ctrl+R to start new chat
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('new-chat')
    }
  })
}

// App lifecycle events
app.whenReady().then(() => {
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

    // Capture and compress the screenshot
    // The overlay is automatically excluded via setContentProtection(true)
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
  }
})

ipcMain.handle('send-message', async (_event, { text }) => {
  // TODO: Implement Gemini API call
  console.log('Message send requested:', text)
  return { success: false, error: 'Not implemented yet' }
})

ipcMain.handle('save-config', async (_event, { key }) => {
  // TODO: Implement config save
  console.log('Config save requested:', key)
  return { success: true }
})

ipcMain.handle('load-config', async (_event, key) => {
  // TODO: Implement config load
  console.log('Config load requested:', key)
  return { success: true, value: null }
})

ipcMain.handle('get-displays', async () => {
  // TODO: Implement display detection
  console.log('Get displays requested')
  return { success: true, displays: [] }
})
