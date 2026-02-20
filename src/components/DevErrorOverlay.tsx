// src/components/DevErrorOverlay.tsx

import React, { useEffect, useState } from 'react'

interface DevLog {
  time: string
  level: string
  message: string
  metadata?: any
}

const LOGGING_ENABLED = import.meta.env.VITE_LOGGING_ENABLED !== 'false'

const DevErrorOverlay: React.FC = () => {
  const [logs, setLogs] = useState<DevLog[]>([])

  useEffect(() => {
    if (!LOGGING_ENABLED) return
    const interval = setInterval(() => {
      const stored = JSON.parse(sessionStorage.getItem('devLogs') || '[]')
      setLogs(stored)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!import.meta.env.DEV || !LOGGING_ENABLED) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        background: 'rgba(0,0,0,0.9)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '8px',
        zIndex: 9999,
        maxHeight: '30vh',
        overflowY: 'auto',
      }}
    >
      <strong>DEV LOGS:</strong>
      <ul style={{ margin: 0, paddingLeft: '1em' }}>
        {logs.map((l, i) => (
          <li key={i}>
            {l.time} | {l.level}: {l.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DevErrorOverlay
