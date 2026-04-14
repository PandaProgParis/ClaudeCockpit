import { app, BrowserWindow, Tray, Menu, nativeImage, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

function logToFile(msg: string): void {
  try {
    const logPath = path.join(app.getPath('userData'), 'main.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

process.on('uncaughtException', (err) => {
  logToFile(`UNCAUGHT: ${err.stack || err.message}`)
  dialog.showErrorBox('Claude Cockpit Error', err.stack || err.message)
  app.quit()
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const PORT = 3001
const DEV_PORT = 5200

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png')
  }
  return path.join(__dirname, '..', 'electron', 'icon.png')
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

  const url = app.isPackaged
    ? `http://localhost:${PORT}`
    : `http://localhost:${DEV_PORT}`

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

  if (!app.isPackaged) {
    // In dev mode, Express is already running via concurrently
    return
  }

  // In packaged mode, load the bundled server (compiled by esbuild)
  const serverPath = path.join(__dirname, '..', 'server', 'index.js')
  const { startServer } = require(serverPath)
  await startServer()
}

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

app.on('ready', async () => {
  logToFile('App ready event fired')
  try {
    logToFile('Starting Express server...')
    await startExpressServer()
    logToFile('Express server started')
  } catch (err: any) {
    logToFile(`Failed to start Express: ${err.stack || err.message}`)
    dialog.showErrorBox('Claude Cockpit', `Server error: ${err.message}`)
    app.quit()
    return
  }

  logToFile('Creating tray and window...')
  createTray()
  createWindow()
  logToFile('App fully initialized')
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('activate', () => {
  // macOS: re-show window when clicking dock icon
  mainWindow?.show()
})
