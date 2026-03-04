import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { purgeLegacyPlaintextSeed } from './utils/crypto'

// SECURITY: Remove any plaintext seed phrase left by legacy code
purgeLegacyPlaintextSeed();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
