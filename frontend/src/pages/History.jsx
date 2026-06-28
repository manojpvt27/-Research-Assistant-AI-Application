import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useResearch from '../hooks/useResearch.js'
import ReportCard from '../components/ReportCard.jsx'
import { 
  Search, 
  Trash2, 
  Calendar, 
  Loader2, 
  Archive,
  ArrowRight,
  FilterX
} from 'lucide-react'

export default function History() {
  const { 
    history, 
    fetchHistory, 
    deleteReport, 
    bulkDeleteReports, 
    searchHistoryTopics,
    error 
  } = useResearch()

  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Fetch reports on mount/page change
  const loadReports = useCallback(async (pageNum = 1) => {
    setLoading(true)
    const items = await fetchHistory(pageNum, 15)
    if (items.length < 15) {
      setHasMore(false)
    } else {
      setHasMore(true)
    }
    setLoading(false)
  }, [fetchHistory])

  useEffect(() => {
    loadReports(1)
    setPage(1)
  }, [loadReports])

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (keyword.trim()) {
      await searchHistoryTopics(keyword.trim())
      setHasMore(false) // search returns everything matched
    } else {
      await loadReports(1)
      setPage(1)
    }
    setLoading(false)
  }

  const handleResetFilters = () => {
    setKeyword('')
    setStartDate('')
    setEndDate('')
    loadReports(1)
    setPage(1)
    setSelectedIds([])
  }

  // Client-side date range filtering
  const filteredHistory = history.filter((report) => {
    const reportDate = new Date(report.created_at)
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (reportDate < start) return false
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (reportDate > end) return false
    }
    return true
  })

  // Checkbox interactions
  const handleSelectReport = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      const allFilteredIds = filteredHistory.map((item) => item.id)
      setSelectedIds(allFilteredIds)
    } else {
      setSelectedIds([])
    }
  }

  // Delete handlers
  const handleDeleteSingle = async (id) => {
    if (confirm("Are you sure you want to delete this research report?")) {
      const success = await deleteReport(id)
      if (success) {
        setSelectedIds((prev) => prev.filter((item) => item !== id))
      }
    }
  }

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected reports?`)) {
      setLoading(true)
      const success = await bulkDeleteReports(selectedIds)
      if (success) {
        setSelectedIds([])
        loadReports(1)
      } else {
        setLoading(false)
      }
    }
  }

  const handleOpenReport = (id) => {
    navigate(`/report/${id}`)
  }

  const handleNextPage = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadReports(nextPage)
  }

  const handlePrevPage = () => {
    if (page > 1) {
      const prevPage = page - 1
      setPage(prevPage)
      loadReports(prevPage)
    }
  }

  const allSelected = filteredHistory.length > 0 && selectedIds.length === filteredHistory.length

  return (
    <div className="space-y-6 pb-12">
      {/* Header title */}
      <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-4">
        <Archive className="w-5 h-5 text-purple-400" />
        <h1 className="text-xl md:text-2xl font-bold text-white">Research Archive Catalog</h1>
      </div>

      {/* Filter panel */}
      <div className="bg-[#1A1A2E] border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Keyword Search */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">Search Keywords</label>
            <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-cyan-500 rounded-xl px-3 py-2 transition-colors">
              <Search className="w-4 h-4 text-slate-500 mr-2" />
              <input
                type="text"
                placeholder="Topic, details, text..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">Start Date</label>
            <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-cyan-500 rounded-xl px-3 py-2 transition-colors">
              <Calendar className="w-4 h-4 text-slate-500 mr-2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-300 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">End Date</label>
            <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-cyan-500 rounded-xl px-3 py-2 transition-colors">
              <Calendar className="w-4 h-4 text-slate-500 mr-2" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-300 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/95 text-white font-semibold py-2 rounded-xl text-sm transition-colors shadow shadow-primary/20"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 p-2 rounded-xl transition-all"
              title="Reset Filters"
            >
              <FilterX className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Bulk actions block */}
      {filteredHistory.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#1A1A2E]/40 border border-slate-800/80 px-4 py-3 rounded-2xl gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-750 bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="select-all" className="text-xs font-semibold text-slate-400 cursor-pointer selection:bg-transparent select-none">
              Select All Shown ({filteredHistory.length} items)
            </label>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Grid contents */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-[#1A1A2E]/50 border border-slate-800/60 rounded-2xl p-16 text-center max-w-lg mx-auto">
          <Archive className="w-10 h-10 text-slate-700 mx-auto mb-3.5 opacity-55" />
          <p className="text-slate-400 text-sm mb-1">No research files match these criteria.</p>
          <p className="text-xs text-slate-500">Try modifying search keyword parameters or date ranges.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onOpen={handleOpenReport}
                onDelete={handleDeleteSingle}
                showCheckbox={true}
                isSelected={selectedIds.includes(report.id)}
                onSelectChange={(checked) => handleSelectReport(report.id, checked)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-750 disabled:bg-slate-900/50 disabled:text-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              Previous Page
            </button>
            <span className="text-xs text-slate-400 font-medium">Page {page}</span>
            <button
              onClick={handleNextPage}
              disabled={!hasMore}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-750 disabled:bg-slate-900/50 disabled:text-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              Next Page
            </button>
          </div>
        </>
      )}
    </div>
  )
}
