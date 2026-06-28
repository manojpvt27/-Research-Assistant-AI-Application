import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brain, History, Home as HomeIcon } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path
  
  return (
    <header className="border-b border-slate-800/80 bg-[#121224] sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between max-w-7xl">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform duration-300">
            <Brain className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white transition-colors duration-300">
            Research<span className="text-cyan-400 font-light">AI</span>
          </span>
        </Link>
        
        <nav className="flex space-x-1 md:space-x-2">
          <Link 
            to="/" 
            className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/') 
                ? 'bg-primary text-white shadow-md shadow-primary/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/history" 
            className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive('/history') 
                ? 'bg-primary text-white shadow-md shadow-primary/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Archive</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
