const { app } = require('electron')

console.log('app:', app)
console.log('app type:', typeof app)

if (app) {
  console.log('app.whenReady type:', typeof app.whenReady)
  app.whenReady().then(() => {
    console.log('Electron app is ready!')
    app.quit()
  })
} else {
  console.error('ERROR: app is undefined!')
  process.exit(1)
}
