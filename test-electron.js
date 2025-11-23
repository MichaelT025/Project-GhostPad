// Minimal Electron test
console.log('Starting test...')
console.log('Process versions:', process.versions)
console.log('Process type:', process.type)

try {
  const electron = require('electron')
  console.log('Electron type:', typeof electron)
  console.log('Electron value:', electron)

  if (typeof electron === 'string') {
    console.log('ERROR: electron is a string (path), not the API object!')
  } else if (electron && electron.app) {
    console.log('SUCCESS: electron.app exists!')
    electron.app.whenReady().then(() => {
      console.log('App is ready!')
      electron.app.quit()
    })
  }
} catch (err) {
  console.error('Error requiring electron:', err)
}
