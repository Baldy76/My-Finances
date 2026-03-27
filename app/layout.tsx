import './globals.css'
import { Home, Target, Vault, PlusCircle } from 'lucide-react'

export const metadata = {
  title: 'Command Center',
  description: 'Personal Finance PWA',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-darkbg text-white pb-20 font-sans">
        {/* Main App Content */}
        <main className="p-4">{children}</main>

        {/* Floating Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-cardbg/80 backdrop-blur-lg border-t border-gray-800 p-4 flex justify-around items-center rounded-t-2xl z-50">
          <button className="flex flex-col items-center text-gray-400 hover:text-white">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button className="flex flex-col items-center text-gray-400 hover:text-white">
            <Target size={24} />
            <span className="text-xs mt-1">Goals</span>
          </button>

          {/* The Big Action Button */}
          <button className="flex flex-col items-center text-starling -mt-8 bg-darkbg rounded-full p-2 border-4 border-cardbg">
            <PlusCircle size={40} />
          </button>

          <button className="flex flex-col items-center text-gray-400 hover:text-white">
            <Vault size={24} />
            <span className="text-xs mt-1">Vault</span>
          </button>
        </nav>
      </body>
    </html>
  )
}
