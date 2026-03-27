'use client'
import { useState } from 'react'

export default function Dashboard() {
  const [halifax, setHalifax] = useState(1250.00)
  const [barclays, setBarclays] = useState(-150.00) 
  const [starling, setStarling] = useState(800.00)
  const [pendingBills, setPendingBills] = useState(450.00)

  const totalCash = halifax + barclays + starling
  const safeToSpend = totalCash - pendingBills

  return (
    <div className="space-y-6 pt-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Command Center 🚀</h1>
          <p className="text-gray-400 text-sm">Welcome back, Boss.</p>
        </div>
      </header>

      <div className="bg-gradient-to-br from-cardbg to-gray-900 rounded-3xl p-6 border border-gray-800 shadow-xl text-center">
        <p className="text-gray-400 font-medium mb-2">Safe to Spend</p>
        <h2 className={`text-5xl font-extrabold tracking-tight ${safeToSpend < 0 ? 'text-red-500' : 'text-white'}`}>
          £{safeToSpend.toFixed(2)}
        </h2>
        <p className="text-sm text-gray-500 mt-4">
          Total Cash: £{totalCash.toFixed(2)} | Pending Bills: £{pendingBills.toFixed(2)}
        </p>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-4">Your Vaults 🏦</h3>
      <div className="space-y-3">
        
        <div className="flex justify-between items-center bg-cardbg p-4 rounded-2xl border-l-4 border-halifax">
          <div className="flex items-center gap-3">
            <div className="bg-halifax text-white p-2 rounded-full font-bold text-xs">HX</div>
            <p className="font-medium">Halifax Joint</p>
          </div>
          <p className="font-bold">£{halifax.toFixed(2)}</p>
        </div>

        <div className="flex justify-between items-center bg-cardbg p-4 rounded-2xl border-l-4 border-barclays">
          <div className="flex items-center gap-3">
            <div className="bg-barclays text-white p-2 rounded-full font-bold text-xs">BC</div>
            <div>
              <p className="font-medium">Barclays Current</p>
              {barclays < 0 && <span className="text-xs text-red-400">Overdraft Active 🚨</span>}
            </div>
          </div>
          <p className={`font-bold ${barclays < 0 ? 'text-red-400' : ''}`}>£{barclays.toFixed(2)}</p>
        </div>

        <div className="flex justify-between items-center bg-cardbg p-4 rounded-2xl border-l-4 border-starling">
          <div className="flex items-center gap-3">
            <div className="bg-starling text-gray-900 p-2 rounded-full font-bold text-xs">ST</div>
            <p className="font-medium">Starling Savings</p>
          </div>
          <p className="font-bold">£{starling.toFixed(2)}</p>
        </div>

      </div>
    </div>
  )
}
