import React, { useEffect, useState } from 'react'
import SearchBar from '../components/SearchBar.jsx'
import ReportCard from '../components/ReportCard.jsx'
import useResearch from '../hooks/useResearch.js'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

export default function Home() {
  const { history, fetchHistory, startResearch } = useResearch()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchHistory(1, 5).then(() => setLoading(false))
  }, [fetchHistory])

  const handleSearch = (topic) => {
    startResearch(topic)
  }

  const handleOpenReport = (id) => {
    navigate(`/report/${id}`)
  }

  return (
    <div className="space-y-12 pb-12">
      {/* Hero section */}
      <section className="text-center max-w-4xl mx-auto pt-8 md:pt-12 space-y-5 bg-gradient-hero">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by Claude Sonnet & Vector Memory</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-none">
          AI Personal <span className="text-gradient">Research Assistant</span>
        </h1>
        
        <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Input any topic. The assistant searches DuckDuckGo, extracts source content concurrently, queries vector memory for context, and synthesizes a structured report.
        </p>
      </section>

      {/* Search Input Section */}
      <section>
        <SearchBar onSearch={handleSearch} />
      </section>

      {/* Recent reports list */}
      <section className="max-w-6xl mx-auto space-y-6 pt-6">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
            <span>Recent Operations</span>
          </h2>
          <Link 
            to="/history" 
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>View Full Archive</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-[#1A1A2E]/50 border border-slate-800/60 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-md">
            <p className="text-slate-400 text-sm mb-1.5">No historical reports found.</p>
            <p className="text-xs text-slate-500">Type a query in the search bar above to generate a research analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.slice(0, 5).map((report) => (
              <ReportCard 
                key={report.id} 
                report={report} 
                onOpen={handleOpenReport} 
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
