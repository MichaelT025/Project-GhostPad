const electron = require('electron')

console.log('electron:', electron)
console.log('electron type:', typeof electron)
console.log('electron keys:', electron ? Object.keys(electron) : 'N/A')
