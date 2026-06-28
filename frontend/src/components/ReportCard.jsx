import React from 'react'
import { Calendar, FileText, Globe, ArrowRight, Trash2 } from 'lucide-react'

export default function ReportCard({ 
  report, 
  onOpen, 
  onDelete, 
  isSelected = false, 
  onSelectChange, 
  showCheckbox = false 
}) {
  const dateStr = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className={`relative bg-[#1A1A2E] border rounded-2xl p-5 shadow-lg flex flex-col justify-between overflow-hidden glow-card ${
      isSelected ? 'border-purple-500 bg-purple-500/5' : 'border-slate-800/80'
    }`}>
      {/* Date & Checkbox Header */}
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2">
            {showCheckbox && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelectChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-[#1A1A2E] cursor-pointer"
              />
            )}
            {onDelete && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(report.id);
                }}
                className="text-slate-500 hover:text-red-400 p-1 rounded-md transition-colors"
                title="Delete this report"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <h3 className="font-bold text-base md:text-lg text-white mb-4 line-clamp-2 leading-snug">
          {report.topic}
        </h3>
      </div>

      {/* Metrics & Button */}
      <div className="mt-auto">
        <div className="flex items-center justify-between border-t border-slate-800/60 pt-3.5 text-slate-400 text-xs mb-4">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>{report.word_count} words</span>
          </div>
          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{report.source_count} sources</span>
          </div>
        </div>

        <button
          onClick={() => onOpen(report.id)}
          className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-primary text-slate-200 hover:text-white font-medium py-2 rounded-xl text-xs md:text-sm transition-all duration-300 group"
        >
          <span>Open Report</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}
