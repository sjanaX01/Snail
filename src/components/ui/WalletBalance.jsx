import React from 'react'

function WalletBalance({ balance, price, priceColor }) {
  return (
    <div className="balance-area mb-9 flex flex-col gap-4">
    <div className="ac-balance text-4xl font-bold">
      $ {balance}
      {/* Ensure balance is shown as a floating value */}
    </div>
    <div className={priceColor}>{price}</div>
  </div>
  )
}

export default WalletBalance