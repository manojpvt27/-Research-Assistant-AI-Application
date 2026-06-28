import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import useResearch from '../hooks/useResearch.js'
import SourceCard from '../components/SourceCard.jsx'
import MemoryPanel from '../components/MemoryPanel.jsx'
import { 
  FileDown, 
  Share2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  ArrowLeft,
  BookOpen,
  Calendar,
  AlertCircle
} from 'lucide-react'

export default function Report() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    currentReport, 
    fetchReport, 
    relatedMemory, 
    fetchRelatedMemory, 
    downloadReportFile,
    error 
  } = useResearch()

  const [loading, setLoading] = useState(true)
  const [copiedSection, setCopiedSection] = useState(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [downloading, setDownloading] = useState({ pdf: false, md: false })
  
  // Section toggle collapse state
  const [collapsed, setCollapsed] = useState({
    summary: false,
    findings: false,
    analysis: false,
    conclusion: false
  })

  // Load report and related memory
  useEffect(() => {
    setLoading(true)
    fetchReport(id).then((report) => {
      if (report) {
        fetchRelatedMemory(report.topic).then(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [id, fetchReport, fetchRelatedMemory])

  const toggleSection = (section) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCopyText = (text, sectionName) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(sectionName)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const handleShareUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleExport = async (format) => {
    setDownloading((prev) => ({ ...prev, [format]: true }))
    await downloadReportFile(id, format)
    setDownloading((prev) => ({ ...prev, [format]: false }))
  }

  const handleOpenMemoryReport = (reportId) => {
    navigate(`/report/${reportId}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm text-slate-400">Loading synthesized analysis report...</p>
      </div>
    )
  }

  if (error || !currentReport) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="font-bold text-lg text-white">Report Not Found</h2>
            <p className="text-sm text-red-300 leading-relaxed">
              {error || "The requested research report does not exist or has been deleted."}
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    )
  }

  const dateStr = new Date(currentReport.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Helper component for collapsible sections
  const CollapsibleSection = ({ title, text, idKey, markdown = false }) => {
    const isCollapsed = collapsed[idKey]
    
    return (
      <div className="bg-[#1A1A2E] border border-slate-800/80 rounded-2xl shadow-md overflow-hidden transition-all duration-300">
        {/* Header */}
        <div 
          onClick={() => toggleSection(idKey)}
          className="flex justify-between items-center px-5 py-4 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer border-b border-slate-800/40"
        >
          <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>{title}</span>
          </h3>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => handleCopyText(text, idKey)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-all"
              title="Copy section to clipboard"
            >
              {copiedSection === idKey ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button 
              onClick={() => toggleSection(idKey)}
              className="text-slate-400 hover:text-white p-1"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Content */}
        {!isCollapsed && (
          <div className="p-5 text-slate-300 text-sm md:text-base leading-relaxed space-y-4 prose prose-invert max-w-none">
            {markdown ? (
              <ReactMarkdown className="markdown-body">{text}</ReactMarkdown>
            ) : (
              text.split('\n\n').map((para, i) => (
                <p key={i} className="mb-2 last:mb-0">{para.trim()}</p>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  // Format findings list for markdown compatibility
  const findingsList = currentReport.key_findings.map(f => `* ${f}`).join('\n\n')

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center gap-1.5 text-xs md:text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3.5xl font-bold tracking-tight text-white leading-tight">
            {currentReport.topic}
          </h1>
          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <span>•</span>
            <span>{currentReport.word_count} words</span>
            <span>•</span>
            <span>{currentReport.source_count} sources analyzed</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Share Link */}
          <button
            onClick={handleShareUrl}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm border border-slate-750"
          >
            {copiedUrl ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </>
            )}
          </button>

          {/* Export PDF */}
          <button
            onClick={() => handleExport('pdf')}
            disabled={downloading.pdf}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-purple-900/20"
          >
            {downloading.pdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Export PDF</span>
          </button>

          {/* Export Markdown */}
          <button
            onClick={() => handleExport('markdown')}
            disabled={downloading.md}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-900/20"
          >
            {downloading.md ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Export MD</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Side (Report Details) */}
        <div className="lg:col-span-7 space-y-6">
          <CollapsibleSection 
            title="Executive Summary" 
            text={currentReport.executive_summary} 
            idKey="summary" 
          />
          <CollapsibleSection 
            title="Key Findings" 
            text={findingsList} 
            idKey="findings" 
            markdown={true}
          />
          <CollapsibleSection 
            title="Detailed Analysis" 
            text={currentReport.detailed_analysis} 
            idKey="analysis" 
          />
          <CollapsibleSection 
            title="Conclusion" 
            text={currentReport.conclusion} 
            idKey="conclusion" 
          />

          {/* Sources block */}
          <div className="bg-[#1A1A2E]/30 border border-slate-800/80 rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
            <h3 className="font-bold text-white text-base border-b border-slate-800/80 pb-3">
              Sources & Credibility Ratings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentReport.sources.map((source, idx) => (
                <SourceCard key={idx} source={source} isLive={false} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side (Memory Panel) */}
        <div className="lg:col-span-3">
          <div className="sticky top-24">
            <MemoryPanel 
              relatedItems={relatedMemory} 
              onOpen={handleOpenMemoryReport} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
