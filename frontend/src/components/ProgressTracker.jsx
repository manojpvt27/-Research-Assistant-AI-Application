import React from 'react'
import { Search, Globe, Cpu, CheckCircle, Loader2 } from 'lucide-react'

export default function ProgressTracker({ currentStep, stepMessage, sourceCount, scrapedSources = [] }) {
  const steps = [
    { id: 1, label: "Search DDG", icon: Search, desc: "Gathering source list" },
    { id: 2, label: "Scrape Content", icon: Globe, desc: "Reading text concurrently" },
    { id: 3, label: "Claude Core", icon: Cpu, desc: "Synthesizing JSON report" },
    { id: 4, label: "Complete", icon: CheckCircle, desc: "Final report generated" }
  ]

  return (
    <div className="bg-[#1A1A2E] border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            {currentStep < 4 ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <span>Analysis Pipeline</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">{stepMessage}</p>
        </div>
        {currentStep === 2 && sourceCount > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs text-slate-300">
            Read <span className="font-semibold text-cyan-400">{sourceCount}</span> sources
          </div>
        )}
      </div>

      {/* Progress track */}
      <div className="relative flex flex-col md:flex-row justify-between items-stretch md:items-center w-full gap-4 md:gap-0">
        {/* Desktop connection lines */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-800 hidden md:block z-0"></div>
        <div 
          className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400 hidden md:block z-0 transition-all duration-500 ease-in-out"
          style={{ width: `${Math.max(0, ((currentStep - 1) / 3) * 98)}%` }}
        ></div>

        {steps.map((step) => {
          const Icon = step.icon
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          
          return (
            <div key={step.id} className="flex md:flex-col items-center md:items-center relative z-10 gap-3 md:gap-2.5 w-full md:w-1/4">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                  isCompleted 
                    ? 'bg-green-500/10 border-green-500 text-green-400' 
                    : isActive 
                      ? 'bg-purple-500/10 border-purple-400 text-purple-400 shadow-md shadow-purple-500/10' 
                      : 'bg-[#121224] border-slate-800 text-slate-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isActive && step.id !== 4 ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div className="text-left md:text-center">
                <p className={`font-semibold text-sm ${isActive ? 'text-cyan-400' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-500 hidden md:block mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
