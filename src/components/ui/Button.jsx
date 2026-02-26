import React from 'react'

function Button({ text, onClick, disabled, type = "button" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className='flex items-center space-x-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
    >
      {text}
    </button>
  )
}

export default Button