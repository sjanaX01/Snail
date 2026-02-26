import React from 'react'

function CryptoVault({ children }) {
  return (
    <div
      className='h-96 p-10 w-full border-2 rounded-2xl'
      style={{ borderColor: 'var(--border-strong)' }}
    >
      {children}
    </div>
  )
}

export default CryptoVault