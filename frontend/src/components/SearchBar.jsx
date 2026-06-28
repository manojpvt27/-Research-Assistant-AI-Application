import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'

const PLACEHOLDERS = [
  "Quantum Computing advancements...",
  "Impact of microplastics on marine biology...",
  "Latest breakthroughs in fusion energy...",
  "History of Renaissance architecture...",
  "AI safety research and governance...",
  "Innovations in solid-state batteries..."
]

export default function SearchBar({ onSearch }) {
  const [topic, setTopic] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [currentPlaceholder, setCurrentPlaceholder] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Typewriter animation effect for placeholders
  useEffect(() => {
    let timer;
    const fullText = PLACEHOLDERS[placeholderIndex];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentPlaceholder(fullText.substring(0, currentPlaceholder.length - 1));
      }, 30);
    } else {
      timer = setTimeout(() => {
        setCurrentPlaceholder(fullText.substring(0, currentPlaceholder.length + 1));
      }, 70);
    }

    if (!isDeleting && currentPlaceholder === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2500); // Delay before deleting
    } else if (isDeleting && currentPlaceholder === '') {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }

    return () => clearTimeout(timer);
  }, [currentPlaceholder, isDeleting, placeholderIndex]);

  const handleSubmit = (e) => {
    e.preventDefault()
    if (topic.trim()) {
      onSearch(topic.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        {/* Glow shadow behind search bar */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl blur-md opacity-25 group-hover:opacity-45 transition duration-500 group-focus-within:opacity-50"></div>
        
        <div className="relative flex items-center bg-[#16162a] border border-slate-800 rounded-2xl p-2 focus-within:border-cyan-500/80 transition-all duration-300">
          <Search className="w-5 h-5 text-slate-400 ml-3 mr-2" />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={currentPlaceholder}
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none py-2.5 px-1 text-base md:text-lg font-normal"
          />
          <button
            type="submit"
            disabled={!topic.trim()}
            className="bg-primary hover:bg-primary/90 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-sm md:text-base px-6 py-2.5 rounded-xl shadow-lg transition-all duration-200"
          >
            Research
          </button>
        </div>
      </div>
    </form>
  )
}
