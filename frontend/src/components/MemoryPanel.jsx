import React from 'react'
import { Brain, ArrowRight } from 'lucide-react'

export default function MemoryPanel({ relatedItems = [], onOpen }) {
  return (
    <div className="bg-[#1A1A2E] border border-slate-800/80 rounded-2xl p-5 shadow-xl h-full">
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-805">
        <Brain className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold text-white text-base">Semantic Memory Context</h3>
      </div>
      
      {relatedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <Brain className="w-8 h-8 text-slate-700 mb-2.5 opacity-40 animate-pulse" />
          <p className="text-xs text-slate-500">No overlapping historical research found in local memory storage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            The vector memory index retrieved the following highly correlated historical studies:
          </p>
          <div className="space-y-3">
            {relatedItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-900/60 hover:bg-[#121226] border border-slate-800 rounded-xl p-3.5 transition-all duration-300 group cursor-pointer hover:border-purple-500/40"
                onClick={() => onOpen(item.id)}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="font-bold text-xs md:text-sm text-cyan-400 line-clamp-1 flex-1 group-hover:text-purple-400 transition-colors">
                    {item.topic}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
