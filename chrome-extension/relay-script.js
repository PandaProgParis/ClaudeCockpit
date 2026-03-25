// Runs in ISOLATED world — has access to chrome.runtime
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://claude.ai') return
  if (event.data?.type !== '__cockpit_usage_data__') return

  chrome.runtime.sendMessage({
    type: 'usage-data',
    payload: event.data.payload
  })
})
