const DEFAULT_COCKPIT_URL = 'http://localhost:6501/api/usage/inject'
const DEFAULT_INTERVAL_MIN = 15

let syncWindowId = null

// --- Alarm setup ---

chrome.runtime.onInstalled.addListener(async () => {
  const { intervalMin } = await chrome.storage.local.get({ intervalMin: DEFAULT_INTERVAL_MIN })
  chrome.alarms.create('usage-sync', { periodInMinutes: intervalMin })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'usage-sync') startSync()
})

// --- Sync: open window, wait for data, close ---

async function startSync() {
  if (syncWindowId != null) return

  setBadge('⏳', '#FF9800')

  try {
    const win = await chrome.windows.create({
      url: 'https://claude.ai/settings/usage',
      state: 'minimized'
    })
    syncWindowId = win.id

    // Auto-close after 15s if no data received
    setTimeout(async () => {
      if (syncWindowId != null) {
        try { await chrome.windows.remove(syncWindowId) } catch {}
        syncWindowId = null
        setBadge('!', '#F44336')
        await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'error' })
      }
    }, 15000)
  } catch {
    syncWindowId = null
    setBadge('!', '#F44336')
    await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'error' })
  }
}

// Clean up reference when window is closed manually
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === syncWindowId) syncWindowId = null
})

// --- Message handling ---

chrome.runtime.onMessage.addListener((message) => {
  console.log('[Cockpit] message received:', message.type)
  if (message.type === 'manual-sync') {
    startSync()
    return
  }
  if (message.type === 'usage-data') {
    console.log('[Cockpit] usage data received, payload keys:', Object.keys(message.payload || {}))
    handleUsageData(message.payload)
  }
})

async function handleUsageData(payload) {
  // Close the sync window
  if (syncWindowId != null) {
    try { await chrome.windows.remove(syncWindowId) } catch {}
    syncWindowId = null
  }

  try {
    await chrome.storage.local.set({ lastPayload: payload })

    const { endpoint } = await chrome.storage.local.get({ endpoint: DEFAULT_COCKPIT_URL })
    const url = endpoint || DEFAULT_COCKPIT_URL

    console.log('[Cockpit] POSTing to', url)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    console.log('[Cockpit] response status:', resp.status)

    if (resp.ok) {
      setBadge('', '#4CAF50')
      await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'ok' })
    } else {
      const text = await resp.text()
      console.error('[Cockpit] inject failed:', resp.status, text)
      setBadge('!', '#F44336')
      await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'error' })
    }
  } catch (err) {
    console.error('[Cockpit] fetch error:', err.message)
    setBadge('!', '#F44336')
    await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'error' })
  }
}

// --- Badge helper ---

function setBadge(text, color) {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
}
