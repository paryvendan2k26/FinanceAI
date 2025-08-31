// components/ChatInterface.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Search, ExternalLink, Loader2, Bot, User } from 'lucide-react'
import { socketManager } from '@/lib/socket'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  sources?: Array<{
    title: string
    url: string
    content: string
    relevance_score: number
  }>
  isStreaming?: boolean
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const socket = socketManager.connect()
    
    socket.on('search_result', (sources) => {
      setMessages(prev => {
        const updated = [...prev]
        const lastMessage = updated[updated.length - 1]
        if (lastMessage && lastMessage.type === 'bot') {
          lastMessage.sources = sources
        }
        return updated
      })
    })
    
    socket.on('content', (chunk) => {
      setMessages(prev => {
        const updated = [...prev]
        const lastMessage = updated[updated.length - 1]
        if (lastMessage && lastMessage.type === 'bot') {
          lastMessage.content += chunk
          lastMessage.isStreaming = true
        }
        return updated
      })
    })
    
    socket.on('done', () => {
      setIsLoading(false)
      setMessages(prev => {
        const updated = [...prev]
        const lastMessage = updated[updated.length - 1]
        if (lastMessage && lastMessage.type === 'bot') {
          lastMessage.isStreaming = false
        }
        return updated
      })
    })
    
    socket.on('error', (error) => {
      setIsLoading(false)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isStreaming: false
      }])
    })
    
    return () => {
      socket.off('search_result')
      socket.off('content')
      socket.off('done')
      socket.off('error')
    }
  }, [])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSend = () => {
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }
    
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }
    
    setMessages(prev => [...prev, userMessage, botMessage])
    setIsLoading(true)
    
    const socket = socketManager.getSocket()
    socket?.emit('chat', { query: input })
    
    setInput('')
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="glass-card h-[600px] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold gradient-text flex items-center space-x-2">
            <Bot className="w-8 h-8" />
            <span>AI Financial Assistant</span>
          </h2>
          <p className="text-gray-400 mt-2">
            Ask me anything about stocks, markets, or financial analysis
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto text-neon-blue/50 mb-4" />
              <p className="text-gray-400 text-lg">
                Start a conversation by asking about financial topics
              </p>
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => setInput("What's the current market sentiment?")}
                  className="block w-full text-left p-3 glass-card hover:neon-border transition-all duration-300 rounded-lg"
                >
                  Whats the current market sentiment?
                </button>
                <button
                  onClick={() => setInput("Analyze Tesla's recent performance")}
                  className="block w-full text-left p-3 glass-card hover:neon-border transition-all duration-300 rounded-lg"
                >
                  Analyze Teslas recent performance
                </button>
                <button
                  onClick={() => setInput("What are the top growth stocks right now?")}
                  className="block w-full text-left p-3 glass-card hover:neon-border transition-all duration-300 rounded-lg"
                >
                  What are the top growth stocks right now?
                </button>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-neon-blue to-neon-purple p-4 rounded-2xl text-white'
                    : 'glass-card p-4 rounded-2xl'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.type === 'bot' && (
                    <Bot className="w-6 h-6 text-neon-blue flex-shrink-0 mt-1" />
                  )}
                  {message.type === 'user' && (
                    <User className="w-6 h-6 text-white flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {message.isStreaming && (
                      <div className="typing-indicator mt-2">
                        <div className="typing-dot" style={{'--delay': '0ms'} as any}></div>
                        <div className="typing-dot" style={{'--delay': '150ms'} as any}></div>
                        <div className="typing-dot" style={{'--delay': '300ms'} as any}></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center space-x-2 mb-2">
                      <Search className="w-4 h-4 text-neon-blue" />
                      <span className="text-sm font-medium text-neon-blue">Sources</span>
                    </div>
                    <div className="space-y-2">
                      {message.sources.slice(0, 3).map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 text-sm"
                        >
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                            <span className="text-white truncate flex-1">
                              {source.title || 'Untitled'}
                            </span>
                            <span className="text-neon-blue text-xs">
                              {Math.round(source.relevance_score * 100)}%
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-6 border-t border-white/10">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about stocks, markets, or financial analysis..."
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 resize-none focus:outline-none focus:neon-border transition-all duration-300"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
