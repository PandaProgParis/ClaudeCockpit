import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const PORT = 3001
const DEV_PORT = 5200
const isDev = !app.isPackaged

function getIconPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', 'electron', 'icon.png')
  }
  return path.join(process.resourcesPath, 'icon.png')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const url = isDev
    ? `http://localhost:${DEV_PORT}`
    : `http://localhost:${PORT}`

  mainWindow.loadURL(url)

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  const icon = nativeImage.createFromPath(getIconPath())
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Claude Cockpit',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Claude Cockpit')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

async function startExpressServer(): Promise<void> {
  process.env.ELECTRON = '1'
  process.env.NODE_ENV = 'production'

  if (isDev) {
    // In dev mode, Express is already running via concurrently
    // Just wait for it to be available
    return
  }

  // In packaged mode, load the bundled server (compiled by esbuild)
  const serverPath = path.join(__dirname, '..', 'dist', 'server', 'index.js')
  const { startServer } = require(serverPath)
  await startServer()
}

app.on('ready', async () => {
  try {
    await startExpressServer()
  } catch (err) {
    console.error('Failed to start Express server:', err)
    app.quit()
    return
  }

  createTray()
  createWindow()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('activate', () => {
  // macOS: re-show window when clicking dock icon
  mainWindow?.show()
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}
