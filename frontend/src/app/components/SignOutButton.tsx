'use client'

import { useState } from 'react'
import { signOut } from '../auth/login/actions'

export default function SignOutButton() {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleSignOut = async () => {
    if (!isConfirming) {
      setIsConfirming(true)
      // Auto-reset after 3 seconds if not clicked again
      setTimeout(() => setIsConfirming(false), 3000)
      return
    }
    await signOut()
  }

  return (
    <button 
      onClick={handleSignOut}
      title={isConfirming ? "Click again to confirm" : "Sign out"}
      className={`p-2 transition-all duration-500 rounded-full flex items-center gap-2 group relative ${
        isConfirming 
          ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50 pr-4 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
          : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800/50'
      }`}
    >
      <div className={`transition-transform duration-500 ${isConfirming ? 'rotate-180' : ''}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      
      {isConfirming && (
        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
          Confirm Sign Out?
        </span>
      )}
      
      {/* Subtle hover tooltip when not confirming */}
      {!isConfirming && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-[9px] text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700">
          Sign Out
        </span>
      )}
    </button>
  )
}
