// components/Hero.tsx
import React from 'react'
import { ArrowRight, Zap, Brain, TrendingUp, Search } from 'lucide-react'

interface HeroProps {
  setActiveTab: (tab: 'chat' | 'stock' | 'home') => void
}

export default function Hero({ setActiveTab }: HeroProps) {
  return (
    <div className="text-center py-20 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold mb-6">
          <span className="gradient-text">AI-Powered</span>
          <br />
          Financial Intelligence
        </h1>
        
        <p className="text-xl text-gray-300 mb-12 leading-relaxed">
          Harness the power of artificial intelligence to analyze markets, 
          research stocks, and make informed investment decisions with real-time data.
        </p>
        
        <div className="flex justify-center space-x-6 mb-16">
          <button
            onClick={() => setActiveTab('chat')}
            className="group flex items-center space-x-3 bg-gradient-to-r from-neon-blue to-neon-purple px-8 py-4 rounded-2xl font-semibold text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-neon-blue/25"
          >
            <span>Start AI Chat</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={() => setActiveTab('stock')}
            className="group flex items-center space-x-3 glass-card px-8 py-4 rounded-2xl font-semibold hover:neon-border hover:scale-105 transition-all duration-300"
          >
            <span>Analyze Stocks</span>
            <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="glass-card p-8 text-center hover:neon-border transition-all duration-300 group">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Real-time Research</h3>
            <p className="text-gray-400">
              Get up-to-date market information and financial data from multiple sources instantly.
            </p>
          </div>
          
          <div className="glass-card p-8 text-center hover:neon-border transition-all duration-300 group">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-neon-purple to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI Analysis</h3>
            <p className="text-gray-400">
              Advanced AI models analyze complex financial data to provide actionable insights.
            </p>
          </div>
          
          <div className="glass-card p-8 text-center hover:neon-border transition-all duration-300 group">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
            <p className="text-gray-400">
              Real-time streaming responses with WebSocket technology for instant results.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}