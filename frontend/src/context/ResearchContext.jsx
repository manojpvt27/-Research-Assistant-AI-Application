import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const ResearchContext = createContext(null)

export function ResearchProvider({ children }) {
  const [isResearching, setIsResearching] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepMessage, setStepMessage] = useState('')
  const [scrapedSources, setScrapedSources] = useState([])
  const [currentReport, setCurrentReport] = useState(null)
  const [history, setHistory] = useState([])
  const [relatedMemory, setRelatedMemory] = useState([])
  const [error, setError] = useState(null)
  
  const abortControllerRef = useRef(null)
  const navigate = useNavigate()

  // Start research pipeline SSE
  const startResearch = useCallback(async (topic) => {
    setIsResearching(true)
    setCurrentStep(1)
    setStepMessage('Initializing pipeline request...')
    setScrapedSources([])
    setError(null)
    setCurrentReport(null)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    navigate('/research')

    try {
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP Error: Status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const cleanLine = line.trim()
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.substring(6)
            try {
              const payload = JSON.parse(dataStr)
              
              if (payload.event === 'step') {
                setCurrentStep(payload.step)
                setStepMessage(payload.message)
              } else if (payload.event === 'source_scraped') {
                setScrapedSources((prev) => {
                  if (prev.some(s => s.url === payload.url)) return prev
                  return [
                    ...prev,
                    { url: payload.url, title: payload.title, word_count: payload.word_count }
                  ]
                })
              } else if (payload.event === 'complete') {
                setCurrentReport(payload.report)
                setIsResearching(false)
                setCurrentStep(4)
                setStepMessage('Research report compiled successfully.')
                
                setHistory((prev) => [payload.report, ...prev])
                
                navigate(`/report/${payload.report.id}`)
              } else if (payload.event === 'error') {
                // Set error state directly instead of throwing
                // (throwing here was caught by the inner catch and swallowed)
                setError(payload.message)
                setIsResearching(false)
                setStepMessage('Pipeline failed.')
                return  // stop processing further lines
              }
            } catch (parseErr) {
              console.error('Error parsing SSE line:', parseErr)
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setStepMessage('Research pipeline execution aborted by user.')
        setIsResearching(false)
      } else {
        console.error('Research pipeline failed:', err)
        setError(err.message || 'An unexpected error occurred during research.')
        setIsResearching(false)
      }
    }
  }, [navigate])

  // Cancel research pipeline
  const abortResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsResearching(false)
      setStepMessage('Research request cancelled.')
    }
  }, [])

  // Fetch History from DB
  const fetchHistory = useCallback(async (page = 1, limit = 10) => {
    try {
      setError(null)
      const res = await api.get(`/api/history?page=${page}&limit=${limit}`)
      setHistory(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch history archives.')
      return []
    }
  }, [])

  // Fetch Report details by ID
  const fetchReport = useCallback(async (id) => {
    try {
      setError(null)
      const res = await api.get(`/api/report/${id}`)
      setCurrentReport(res.data)
      return res.data
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load report details.')
      return null
    }
  }, [])

  // Delete single report
  const deleteReport = useCallback(async (id) => {
    try {
      setError(null)
      await api.delete(`/api/report/${id}`)
      setHistory((prev) => prev.filter((item) => item.id !== id))
      return true
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete report.')
      return false
    }
  }, [])

  // Bulk Delete reports
  const bulkDeleteReports = useCallback(async (ids) => {
    try {
      setError(null)
      await Promise.all(ids.map((id) => api.delete(`/api/report/${id}`)))
      setHistory((prev) => prev.filter((item) => !ids.includes(item.id)))
      return true
    } catch (err) {
      setError('Failed during bulk deletion operations.')
      return false
    }
  }, [])

  // Retrieve memory context matches
  const fetchRelatedMemory = useCallback(async (topic) => {
    try {
      const res = await api.get(`/api/memory/related?topic=${encodeURIComponent(topic)}`)
      setRelatedMemory(res.data)
      return res.data
    } catch (err) {
      console.warn('Could not retrieve memory overlap data:', err)
      setRelatedMemory([])
      return []
    }
  }, [])

  // Search archive keywords
  const searchHistoryTopics = useCallback(async (keyword) => {
    try {
      setError(null)
      const res = await api.get(`/api/search/topics?keyword=${encodeURIComponent(keyword)}`)
      setHistory(res.data)
      return res.data
    } catch (err) {
      setError('Failed keyword search in history.')
      return []
    }
  }, [])

  // File downloads PDF / Markdown
  const downloadReportFile = useCallback(async (id, format) => {
    try {
      setError(null)
      const response = await api.post(`/api/export/${format}`, { report_id: id }, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/markdown' 
      })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      link.download = `Research_Report_${id}.${format === 'pdf' ? 'pdf' : 'md'}`
      link.click()
      window.URL.revokeObjectURL(link.href)
      return true
    } catch (err) {
      setError(`Failed to download report as ${format.toUpperCase()}.`)
      return false
    }
  }, [])

  return (
    <ResearchContext.Provider
      value={{
        isResearching,
        currentStep,
        stepMessage,
        scrapedSources,
        currentReport,
        history,
        relatedMemory,
        error,
        startResearch,
        abortResearch,
        fetchHistory,
        fetchReport,
        deleteReport,
        bulkDeleteReports,
        fetchRelatedMemory,
        searchHistoryTopics,
        downloadReportFile
      }}
    >
      {children}
    </ResearchContext.Provider>
  )
}

export function useResearchContext() {
  const context = useContext(ResearchContext)
  if (!context) {
    throw new Error('useResearchContext must be used within a ResearchProvider')
  }
  return context
}
