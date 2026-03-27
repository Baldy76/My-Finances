import './globals.css'
import { Home, Target, Vault, PlusCircle } from 'lucide-react'

export const metadata = {
  title: 'Command Center',
  description: 'Personal Finance PWA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-darkbg text-white pb-24 font-sans">
        <main className="p-4">{children}</main>

        <nav className="fixed bottom-0 w-full bg-cardbg/90 backdrop-blur-lg border-t border-gray-800 p-4 flex justify-around items-center rounded-t-2xl z-50">
          <button className="flex flex-col items-center text-gray-400 hover:text-white">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button className="flex flex-col items-center text-gray-400 hover:text-white">
            <Target size={24} />
            <span className="text-xs mt-1">Goals</span>
          </button>

          <button className="flex flex-col items-center text-starling -mt-10 bg-darkbg rounded-full p-3 border-4 border-cardbg shadow-lg">
            <PlusCircle size={36} />
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
