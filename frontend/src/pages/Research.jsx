import React from 'react'
import ProgressTracker from '../components/ProgressTracker.jsx'
import SourceCard from '../components/SourceCard.jsx'
import useResearch from '../hooks/useResearch.js'
import { AlertCircle, ArrowLeft, XCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Research() {
  const { isResearching, currentStep, stepMessage, scrapedSources, abortResearch, error } = useResearch()
  const navigate = useNavigate()

  const handleCancel = () => {
    abortResearch()
    navigate('/')
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h2 className="font-bold text-lg text-white">Research Operation Failed</h2>
            <p className="text-sm text-red-300 leading-relaxed">{error}</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Tracker component */}
      <ProgressTracker 
        currentStep={currentStep} 
        stepMessage={stepMessage} 
        sourceCount={scrapedSources.length} 
      />

      {/* Real-time Sources Feed */}
      {scrapedSources.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
            <span>Extracted Sources Feed</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scrapedSources.map((source, idx) => (
              <SourceCard key={idx} source={source} isLive={true} />
            ))}
          </div>
        </div>
      )}

      {/* Cancel button action */}
      {isResearching && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-md shadow-red-900/10"
          >
            <XCircle className="w-4 h-4" />
            <span>Abort Research Operation</span>
          </button>
        </div>
      )}
    </div>
  )
}
