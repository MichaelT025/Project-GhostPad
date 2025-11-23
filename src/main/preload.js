const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screen capture
  captureScreen: (displayId) => ipcRenderer.invoke('capture-screen', displayId),

  // Gemini messaging
  sendMessage: (text, image) => ipcRenderer.invoke('send-message', { text, image }),

  // Listen for streaming message chunks
  onMessageChunk: (callback) => {
    ipcRenderer.on('message-chunk', (event, chunk) => callback(chunk))
  },

  // Listen for message complete
  onMessageComplete: (callback) => {
    ipcRenderer.on('message-complete', () => callback())
  },

  // Listen for new chat event (from Ctrl+R)
  onNewChat: (callback) => {
    ipcRenderer.on('new-chat', () => callback())
  },

  // Config management
  saveConfig: (key, value) => ipcRenderer.invoke('save-config', { key, value }),
  loadConfig: (key) => ipcRenderer.invoke('load-config', key),

  // Display detection
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Cleanup listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
