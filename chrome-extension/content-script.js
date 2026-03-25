// Runs in MAIN world — has access to page's real fetch
(function () {
  const originalFetch = window.fetch

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args)

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
      if (url.match(/\/api\/organizations\/[^/]+\/usage$/)) {
        const clone = response.clone()
        const data = await clone.json()
        window.postMessage(
          { type: '__cockpit_usage_data__', payload: data },
          'https://claude.ai'
        )
      }
    } catch {
      // Don't break the page if interception fails
    }

    return response
  }
})()
