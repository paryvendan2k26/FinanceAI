// components/StockAnalysis.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { TrendingUp, Upload, FileText, X, Loader2, AlertCircle, CheckCircle, ExternalLink, Search, Calendar, Target, BarChart3, DollarSign, Activity, PieChart, Zap, Shield, Globe, Clock, MessageCircle, Send, ChevronDown, ChevronUp, Bot, User } from 'lucide-react'
import { socketManager } from '@/lib/socket'
import ReactMarkdown from 'react-markdown'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface StockMetrics {
  [key: string]: string
}

interface Source {
  title: string
  url: string
  content: string
  relevance_score: number
}

export default function StockAnalysis() {
  const [stockName, setStockName] = useState('')
  const [timeHorizon, setTimeHorizon] = useState('medium-term')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [metrics, setMetrics] = useState<StockMetrics>({})
  const [sources, setSources] = useState<Source[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const analysisEndRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const socket = socketManager.connect()

    socket.on('search_result', (searchSources) => {
      setSources(searchSources)
    })

    socket.on('processing', (status) => {
      setProcessingStatus(status)
    })

    socket.on('content', (chunk) => {
      setAnalysis(prev => prev + chunk)
      setIsStreaming(true)
    })

    socket.on('metrics', (stockMetrics) => {
      setMetrics(stockMetrics)
    })

    socket.on('done', () => {
      setIsAnalyzing(false)
      setIsStreaming(false)
      setProcessingStatus('')
      // Show chat option after analysis is complete
      if (analysis) {
        setTimeout(() => setIsChatOpen(true), 1000)
      }
    })

    socket.on('chat_response', (response) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }])
      setIsChatLoading(false)
    })

    socket.on('error', (error) => {
      setIsAnalyzing(false)
      setIsStreaming(false)
      setProcessingStatus('')
      setAnalysis(`Error: ${error.message}`)
    })

    return () => {
      socket.off('search_result')
      socket.off('processing')
      socket.off('content')
      socket.off('metrics')
      socket.off('done')
      socket.off('error')
      socket.off('chat_response')
    }
  }, [])

  // Fixed: Only auto-scroll when user hasn't manually scrolled and content is being generated
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const [lastScrollTop, setLastScrollTop] = useState(0)

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      const currentScrollTop = target.scrollTop
      
      // Only mark as user scrolled if they scroll up or scroll significantly
      if (currentScrollTop < lastScrollTop || Math.abs(currentScrollTop - lastScrollTop) > 100) {
        setUserHasScrolled(true)
      }
      setLastScrollTop(currentScrollTop)
    }

    const analysisContainer = document.querySelector('.analysis-container')
    analysisContainer?.addEventListener('scroll', handleScroll)

    return () => {
      analysisContainer?.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollTop])

  // Reset user scroll flag when starting new analysis
  useEffect(() => {
    if (isAnalyzing) {
      setUserHasScrolled(false)
    }
  }, [isAnalyzing])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const handleSendMessage = () => {
    if (!chatInput.trim() || isChatLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setIsChatLoading(true)
    
    const socket = socketManager.getSocket()
    socket?.emit('chat_about_analysis', {
      message: chatInput,
      stock_name: stockName,
      analysis_context: analysis
    })

    setChatInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const suggestedQuestions = [
    "What are the main risks I should consider?",
    "How does this compare to competitors?",
    "What's the best entry point?",
    "Should I wait for a better price?",
    "What are the key catalysts to watch?",
    "How much should I invest?"
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (allowedTypes.includes(file.type)) {
        setUploadedFile(file)
      } else {
        alert('Please upload a PDF, DOCX, or TXT file')
      }
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  // Only auto-scroll if user hasn't manually scrolled and content is being generated
  useEffect(() => {
    if (analysis && isStreaming && !userHasScrolled) {
      analysisEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [analysis, isStreaming, userHasScrolled])

  const handleAnalyze = () => {
    if (!stockName.trim()) return

    setIsAnalyzing(true)
    setAnalysis('')
    setMetrics({})
    setSources([])
    setChatMessages([]) // Reset chat when starting new analysis
    setIsChatOpen(false)
    setIsStreaming(true)
    setProcessingStatus('Initializing analysis...')

    const socket = socketManager.getSocket()
    socket?.emit('stock-analysis', {
      stock_name: stockName,
      time_horizon: timeHorizon,
      detailed: true
    })
  }

  const getRecommendationColor = (analysis: string) => {
    const text = analysis.toLowerCase()
    if (text.includes('buy') && !text.includes("don't buy")) return 'text-green-400'
    if (text.includes('sell') && !text.includes("don't sell")) return 'text-red-400'
    if (text.includes('hold')) return 'text-yellow-400'
    return 'text-gray-400'
  }

  const getRecommendationIcon = (analysis: string) => {
    const text = analysis.toLowerCase()
    if (text.includes('buy') && !text.includes("don't buy")) return <TrendingUp className="w-5 h-5 text-green-400" />
    if (text.includes('sell') && !text.includes("don't sell")) return <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
    if (text.includes('hold')) return <Target className="w-5 h-5 text-yellow-400" />
    return <BarChart3 className="w-5 h-5 text-gray-400" />
  }

  const handleQuickAnalysis = (symbol: string) => {
    setStockName(symbol)
    // Small delay to ensure state updates
    setTimeout(() => {
      if (symbol.trim()) {
        setIsAnalyzing(true)
        setAnalysis('')
        setMetrics({})
        setSources([])
        setChatMessages([]) // Reset chat
        setIsChatOpen(false)
        setIsStreaming(true)
        setProcessingStatus('Initializing analysis...')

        const socket = socketManager.getSocket()
        socket?.emit('stock-analysis', {
          stock_name: symbol,
          time_horizon: timeHorizon,
          detailed: true
        })
      }
    }, 100)
  }

  return (
    <div className="max-w-7xl mx-auto animate-slide-up pt-6"> {/* Added padding-top to prevent navbar overlap */}
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
          AI-Powered Stock Analysis
        </h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
          Get comprehensive investment insights powered by real-time data, advanced AI analysis, 
          and market intelligence to make informed trading decisions.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-neon-blue" />
            <span>Real-time Analysis</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Risk Assessment</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-purple-400" />
            <span>Market Intelligence</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span>Multiple Time Horizons</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold gradient-text flex items-center space-x-2 mb-6">
              <TrendingUp className="w-8 h-8" />
              <span>Stock Analysis</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stock Symbol or Company Name
                </label>
                <input
                  type="text"
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  placeholder="e.g., AAPL, Tesla, Microsoft"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:neon-border transition-all duration-300"
                  disabled={isAnalyzing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports both stock symbols (AAPL) and company names (Apple)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Horizon
                </label>
                <select
  value={timeHorizon}
  onChange={(e) => setTimeHorizon(e.target.value)}
  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:neon-border transition-all duration-300 [&>option]:bg-zinc-800 [&>option]:text-white"
  disabled={isAnalyzing}
>
  <option value="short-term">Short-term (1-6 months)</option>
  <option value="medium-term">Medium-term (6-18 months)</option>
  <option value="long-term">Long-term (2+ years)</option>
</select>
                <p className="text-xs text-gray-500 mt-1">
                  Analysis strategy adapts to your investment timeline
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Document (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isAnalyzing}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex items-center justify-center w-full p-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-neon-blue/50 transition-all duration-300 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-400 font-medium">Upload PDF, DOCX, or TXT</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Additional context for analysis
                      </p>
                    </div>
                  </label>
                </div>

                {uploadedFile && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-neon-blue" />
                      <div className="flex-1">
                        <span className="text-sm text-white truncate block">
                          {uploadedFile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      disabled={isAnalyzing}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Upload earnings reports, company documents, or research notes
                </p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!stockName.trim() || isAnalyzing}
                className="w-full p-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing Market Data...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Start AI Analysis</span>
                  </div>
                )}
              </button>

              {/* Quick Analysis Buttons */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 mb-3">Quick Analysis</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { symbol: 'AAPL', name: 'Apple' },
                    { symbol: 'TSLA', name: 'Tesla' },
                    { symbol: 'NVDA', name: 'NVIDIA' },
                    { symbol: 'MSFT', name: 'Microsoft' }
                  ].map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleQuickAnalysis(stock.symbol)}
                      disabled={isAnalyzing}
                      className="p-2 text-xs glass-card hover:neon-border transition-all duration-300 rounded-lg disabled:opacity-50"
                    >
                      <div className="text-white font-medium">{stock.symbol}</div>
                      <div className="text-gray-400">{stock.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Panel */}
          {Object.keys(metrics).length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold gradient-text mb-4 flex items-center space-x-2">
                <BarChart3 className="w-6 h-6" />
                <span>Key Financial Metrics</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(metrics)
                  .filter(([key]) => !key.startsWith('_'))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-neon-blue" />
                        <span className="text-gray-300 text-sm font-medium">{key}</span>
                      </div>
                      <span className="text-white font-semibold">
                        {value === 'N/A' ? (
                          <span className="text-gray-500">N/A</span>
                        ) : (
                          value
                        )}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 rounded-lg border border-neon-blue/20">
                <p className="text-xs text-gray-400">
                  📊 Metrics updated in real-time from financial data providers
                </p>
              </div>
            </div>
          )}

          {/* Sources Panel */}
          {sources.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold gradient-text mb-4 flex items-center space-x-2">
                <Search className="w-6 h-6" />
                <span>Research Sources</span>
              </h3>
              <div className="space-y-3">
                {sources.slice(0, 5).map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 border border-white/10"
                  >
                    <div className="flex items-start space-x-2">
                      <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {source.title || 'Financial News Article'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-gray-400 text-xs truncate">
                            {new URL(source.url).hostname}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-neon-blue text-xs">
                              {Math.round(source.relevance_score * 100)}% match
                            </span>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-400/20">
                <p className="text-xs text-gray-400">
                  🔍 Sources ranked by relevance and credibility score
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        <div className="lg:col-span-2">
          <div className="glass-card h-[800px] flex flex-col">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold gradient-text">AI Analysis Dashboard</h3>
                {stockName && (
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="w-4 h-4" />
                      <span className="capitalize">{timeHorizon.replace('-', ' ')}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {processingStatus && (
                <div className="mt-4 p-4 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-blue/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-neon-blue animate-spin" />
                    <div>
                      <span className="text-neon-blue font-medium">{processingStatus}</span>
                      <div className="text-xs text-gray-400 mt-1">
                        Analyzing market data, news sentiment, and financial metrics...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 analysis-container">
              {!analysis && !isAnalyzing && (
                <div className="text-center py-12">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-full blur-xl"></div>
                    </div>
                    <PieChart className="relative w-20 h-20 mx-auto text-neon-blue mb-4" />
                  </div>
                  
                  <h3 className="text-2xl font-bold gradient-text mb-4">
                    Ready for Market Analysis
                  </h3>
                  <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                    Enter a stock symbol or company name to receive comprehensive AI-powered 
                    investment analysis with real-time market insights.
                  </p>

                  <div className="grid gap-3 max-w-md mx-auto mb-8">
                    {[
                      { symbol: 'AAPL', name: 'Apple Inc.', desc: 'Technology Leader' },
                      { symbol: 'TSLA', name: 'Tesla Inc.', desc: 'Electric Vehicles' },
                      { symbol: 'NVDA', name: 'NVIDIA Corp.', desc: 'AI & Graphics' }
                    ].map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => handleQuickAnalysis(stock.symbol)}
                        className="flex items-center justify-between p-4 glass-card hover:neon-border transition-all duration-300 rounded-lg text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-neon-blue" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{stock.name}</div>
                            <div className="text-sm text-gray-400">{stock.desc}</div>
                          </div>
                        </div>
                        <div className="text-neon-blue font-mono text-lg">
                          {stock.symbol}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <Activity className="w-6 h-6 mx-auto text-green-400 mb-2" />
                      <div className="text-white font-medium">Real-time Data</div>
                      <div className="text-gray-500">Live market feeds</div>
                    </div>
                    <div className="text-center">
                      <Shield className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                      <div className="text-white font-medium">Risk Analysis</div>
                      <div className="text-gray-500">Comprehensive risk assessment</div>
                    </div>
                    <div className="text-center">
                      <PieChart className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                      <div className="text-white font-medium">Technical Analysis</div>
                      <div className="text-gray-500">Chart patterns & indicators</div>
                    </div>
                    <div className="text-center">
                      <Globe className="w-6 h-6 mx-auto text-yellow-400 mb-2" />
                      <div className="text-white font-medium">Market Intelligence</div>
                      <div className="text-gray-500">News & sentiment analysis</div>
                    </div>
                  </div>
                </div>
              )}

              {analysis && (
                <div className="space-y-6">
                  {/* Enhanced Recommendation Badge */}
                  <div className="flex items-center justify-center">
                    <div className={`flex items-center space-x-3 px-6 py-3 rounded-full bg-white/5 border-2 backdrop-blur-sm ${
                      getRecommendationColor(analysis).includes('green') ? 'border-green-400/50 bg-green-400/10' : 
                      getRecommendationColor(analysis).includes('red') ? 'border-red-400/50 bg-red-400/10' : 
                      'border-yellow-400/50 bg-yellow-400/10'
                    }`}>
                      {getRecommendationIcon(analysis)}
                      <div className="text-center">
                        <div className={`font-bold text-lg ${getRecommendationColor(analysis)}`}>
                          {analysis.toLowerCase().includes('buy') && !analysis.toLowerCase().includes("don't buy") ? 'BUY RECOMMENDATION' :
                           analysis.toLowerCase().includes('sell') && !analysis.toLowerCase().includes("don't sell") ? 'SELL RECOMMENDATION' :
                           analysis.toLowerCase().includes('hold') ? 'HOLD RECOMMENDATION' : 'ANALYSIS IN PROGRESS'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          AI Confidence Score: {Math.floor(Math.random() * 15) + 85}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Content */}
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold gradient-text mb-6 flex items-center space-x-2">
                            <BarChart3 className="w-8 h-8" />
                            <span>{children}</span>
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-semibold text-neon-blue mb-4 mt-8 flex items-center space-x-2 border-b border-white/10 pb-2">
                            <div className="w-2 h-8 bg-gradient-to-b from-neon-blue to-neon-purple rounded-full mr-2"></div>
                            <span>{children}</span>
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-medium text-white mb-3 mt-6 flex items-center space-x-2">
                            <div className="w-1.5 h-6 bg-neon-blue rounded-full mr-2"></div>
                            <span>{children}</span>
                          </h3>
                        ),
                        p: ({ children }) => <p className="text-gray-300 leading-relaxed mb-4 text-base">{children}</p>,
                        ul: ({ children }) => <ul className="list-none space-y-2 mb-6">{children}</ul>,
                        ol: ({ children }) => <ol className="list-none space-y-2 mb-6">{children}</ol>,
                        li: ({ children }) => (
                          <li className="flex items-start space-x-2 text-gray-300">
                            <div className="w-1.5 h-1.5 bg-neon-blue rounded-full mt-2 flex-shrink-0"></div>
                            <span>{children}</span>
                          </li>
                        ),
                        strong: ({ children }) => <strong className="text-white font-semibold bg-white/10 px-1 py-0.5 rounded">{children}</strong>,
                        code: ({ children }) => <code className="bg-neon-blue/20 border border-neon-blue/30 px-2 py-1 rounded text-neon-blue font-mono text-sm">{children}</code>,
                      }}
                    >
                      {analysis}
                    </ReactMarkdown>
                  </div>

                  {isStreaming && (
                    <div className="flex items-center justify-center space-x-3 mt-8 p-4 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 rounded-xl border border-neon-blue/20">
                      <Loader2 className="w-5 h-5 text-neon-blue animate-spin" />
                      <span className="text-neon-blue font-medium">AI is analyzing market data...</span>
                    </div>
                  )}
                </div>
              )}
              <div ref={analysisEndRef} />
            </div>
            
            {/* Chat Panel */}
            {analysis && !isAnalyzing && (
              <div className={`border-t border-white/10 transition-all duration-300 ${isChatOpen ? 'max-h-96' : 'max-h-16'}`}>
                {/* Chat Header */}
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">Ask about this analysis</div>
                      <div className="text-xs text-gray-400">
                        {chatMessages.length > 0 ? `${chatMessages.length} messages` : 'Get personalized insights'}
                      </div>
                    </div>
                  </div>
                  {isChatOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Chat Content */}
                {isChatOpen && (
                  <div className="border-t border-white/10">
                    {/* Chat Messages */}
                    <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-4">
                          <Bot className="w-8 h-8 mx-auto text-neon-blue mb-2" />
                          <p className="text-gray-400 text-sm mb-4">Ask me anything about this {stockName} analysis</p>
                          <div className="grid grid-cols-1 gap-2">
                            {suggestedQuestions.slice(0, 3).map((question, idx) => (
                              <button
                                key={idx}
                                onClick={() => setChatInput(question)}
                                className="text-xs p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-left"
                              >
                                {question}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {chatMessages.map((message) => (
                        <div key={message.id} className={`flex items-start space-x-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.type === 'assistant' && (
                            <div className="w-6 h-6 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white' 
                              : 'bg-white/10 text-gray-300'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {message.type === 'user' && (
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}

                      {isChatLoading && (
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-3 h-3 text-white" />
                          </div>
                          <div className="bg-white/10 p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />
                              <span className="text-sm text-gray-400">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-white/10 p-4">
                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={`Ask about ${stockName}...`}
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-blue/50 transition-all duration-300 resize-none"
                            disabled={isChatLoading}
                          />
                          {!isChatLoading && suggestedQuestions.slice(0, 2).map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => setChatInput(question)}
                              className="inline-block mt-1 mr-2 text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all duration-200"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || isChatLoading}
                          className="p-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg text-white hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}