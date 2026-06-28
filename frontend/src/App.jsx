import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Research from './pages/Research.jsx'
import Report from './pages/Report.jsx'
import History from './pages/History.jsx'
import { ResearchProvider } from './context/ResearchContext.jsx'

function App() {
  return (
    <Router>
      <ResearchProvider>
        <div className="min-h-screen bg-[#0F0F1A] text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-6 md:py-8 max-w-7xl">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/research" element={<Research />} />
              <Route path="/report/:id" element={<Report />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>
      </ResearchProvider>
    </Router>
  )
}

export default App
