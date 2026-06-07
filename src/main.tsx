import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadSave, saveSave, resetBattleRecords } from './storage'

declare global {
  interface Window {
    resetBattleRecords?: () => void
  }
}

function bootstrap() {
  import('./App.tsx').then(({ default: App }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
}

const params = new URLSearchParams(window.location.search)
if (params.get('resetBattleRecords') === '1') {
  saveSave(resetBattleRecords(loadSave()))
  params.delete('resetBattleRecords')
  const nextSearch = params.toString()
  window.location.replace(
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`,
  )
} else {
  if (import.meta.env.DEV) {
    window.resetBattleRecords = () => {
      saveSave(resetBattleRecords(loadSave()))
      window.location.reload()
    }
  }
  bootstrap()
}
