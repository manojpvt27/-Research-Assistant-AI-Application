import React from 'react'
import { Link2, Award, Compass, FileText } from 'lucide-react'

export default function SourceCard({ source, isLive = false }) {
  const getDomain = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  return (
    <div className="bg-[#1A1A2E] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-mono text-cyan-400">{getDomain(source.url)}</span>
          {isLive ? (
            <span className="flex items-center text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
              Scraped
            </span>
          ) : (
            <span className="text-slate-400 font-semibold bg-slate-850 px-2 py-0.5 rounded-full">
              Score: {Math.round(((source.credibility + source.relevance) / 2))}/10
            </span>
          )}
        </div>
        
        <h4 className="font-bold text-slate-100 text-sm line-clamp-1 mb-2">
          {source.title || "Web Document Source"}
        </h4>
        
        <a 
          href={source.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 break-all mb-4"
        >
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span className="underline truncate">{source.url}</span>
        </a>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
        {isLive ? (
          <div className="flex items-center text-xs text-slate-400 gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Extracted <b className="text-slate-200">{source.word_count}</b> words</span>
          </div>
        ) : (
          <>
            <div className="flex items-center text-xs text-slate-400 gap-1">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>Cred: <b className="text-slate-200">{source.credibility}</b>/10</span>
            </div>
            <div className="flex items-center text-xs text-slate-400 gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rel: <b className="text-slate-200">{source.relevance}</b>/10</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
