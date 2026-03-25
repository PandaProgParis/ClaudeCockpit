const DEFAULT_ENDPOINT = 'http://localhost:6501/api/usage/inject'

const intervalSelect = document.getElementById('interval')
const endpointInput = document.getElementById('endpoint')
const statusBar = document.getElementById('status')
const statusText = statusBar.querySelector('.status-text')
const jsonSection = document.getElementById('json-section')
const jsonData = document.getElementById('json-data')
const sendBtn = document.getElementById('send-btn')
const gaugesContainer = document.getElementById('gauges')
const gaugeList = document.getElementById('gauge-list')

// --- Gauge rendering ---

const GAUGE_CONFIG = [
  { key: 'five_hour', label: 'Session (5h)', color: '#D4956A' },
  { key: 'seven_day', label: 'Weekly — All models', color: '#64B5F6' },
  { key: 'seven_day_sonnet', label: 'Weekly — Sonnet', color: '#8BB8E0' },
  { key: 'seven_day_opus', label: 'Weekly — Opus', color: '#FFB74D' },
]

function formatResetTime(isoDate) {
  if (!isoDate) return ''
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m.toString().padStart(2, '0')}`
}

function renderGauges(payload) {
  if (!payload) {
    gaugesContainer.style.display = 'none'
    return
  }

  const gauges = GAUGE_CONFIG
    .filter(g => payload[g.key] && payload[g.key].utilization != null)
    .map(g => ({ ...g, data: payload[g.key] }))

  if (gauges.length === 0) {
    gaugesContainer.style.display = 'none'
    return
  }

  gaugesContainer.style.display = ''
  gaugeList.innerHTML = gauges.map(g => {
    const pct = Math.min(Math.round(g.data.utilization), 100)
    const reset = g.data.resets_at ? formatResetTime(g.data.resets_at) : ''
    return `
      <div class="gauge">
        <div class="gauge-header">
          <span class="gauge-label">${g.label}</span>
          <span class="gauge-reset">${reset ? 'resets ' + reset : ''}</span>
        </div>
        <div class="gauge-row">
          <div class="gauge-track">
            <div class="gauge-fill" style="width:${pct}%; background:${g.color}"></div>
          </div>
          <span class="gauge-value">${pct}%</span>
        </div>
      </div>
    `
  }).join('')
}

// --- Display update ---

function updateDisplay(data) {
  if (data.lastSync) {
    const date = new Date(data.lastSync).toLocaleTimeString()
    const ok = data.lastStatus === 'ok'
    statusText.textContent = `${date} — ${ok ? 'Success' : 'Failed'}`
    statusBar.className = `status-bar ${data.lastStatus}`
  }
  if (data.lastPayload) {
    jsonSection.style.display = 'block'
    jsonData.textContent = JSON.stringify(data.lastPayload, null, 2)
    sendBtn.disabled = false
    renderGauges(data.lastPayload)
  } else {
    sendBtn.disabled = true
    renderGauges(null)
  }
}

function getEndpoint(data) {
  return data.endpoint || DEFAULT_ENDPOINT
}

// --- Init ---

chrome.storage.local.get(
  { intervalMin: 15, endpoint: DEFAULT_ENDPOINT, lastSync: null, lastStatus: null, lastPayload: null },
  (data) => {
    intervalSelect.value = String(data.intervalMin)
    endpointInput.value = data.endpoint || DEFAULT_ENDPOINT
    updateDisplay(data)
  }
)

// Live update when sync completes in background
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  chrome.storage.local.get({ lastSync: null, lastStatus: null, lastPayload: null }, updateDisplay)
})

// Save interval on change + recreate alarm
intervalSelect.addEventListener('change', () => {
  const intervalMin = Number(intervalSelect.value)
  chrome.storage.local.set({ intervalMin })
  chrome.alarms.create('usage-sync', { periodInMinutes: intervalMin })
})

// Save endpoint on change
let endpointTimeout
endpointInput.addEventListener('input', () => {
  clearTimeout(endpointTimeout)
  endpointTimeout = setTimeout(() => {
    const endpoint = endpointInput.value.trim() || DEFAULT_ENDPOINT
    chrome.storage.local.set({ endpoint })
  }, 500)
})

// Sync button
document.getElementById('open-usage-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'manual-sync' })
})

// Send to Cockpit button
sendBtn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['lastPayload', 'endpoint'])
  const payload = data.lastPayload
  if (!payload) return

  const endpoint = data.endpoint || DEFAULT_ENDPOINT

  sendBtn.disabled = true
  sendBtn.querySelector('.send-label').textContent = 'Sending...'

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (resp.ok) {
      sendBtn.querySelector('.send-label').textContent = 'Sent!'
      statusBar.className = 'status-bar ok'
      statusText.textContent = `${new Date().toLocaleTimeString()} — Success`
      await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'ok' })
    } else {
      sendBtn.querySelector('.send-label').textContent = 'Failed'
      statusBar.className = 'status-bar error'
      statusText.textContent = `${new Date().toLocaleTimeString()} — Failed`
      await chrome.storage.local.set({ lastSync: new Date().toISOString(), lastStatus: 'error' })
    }
  } catch {
    sendBtn.querySelector('.send-label').textContent = 'Offline'
    statusBar.className = 'status-bar error'
    statusText.textContent = `${new Date().toLocaleTimeString()} — Failed`
  }

  setTimeout(() => {
    sendBtn.querySelector('.send-label').textContent = 'Send to Cockpit'
    sendBtn.disabled = false
  }, 2000)
})

// Copy JSON button
document.getElementById('copy-btn').addEventListener('click', () => {
  const text = jsonData.textContent
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn')
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.textContent = 'Copy JSON' }, 1500)
  })
})
